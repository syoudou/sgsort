(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var mergeSort, findInsertIndex;
mergeSort = require('mergesort');
findInsertIndex = require('find-insert-index');

module.exports = (function () {
  'use strict';

  var walkStrategies;

  walkStrategies = {};

  function k(result) {
    return function () {
      return result;
    };
  }

  function TreeModel(config) {
    config = config || {};
    this.config = config;
    this.config.childrenPropertyName = config.childrenPropertyName || 'children';
    this.config.modelComparatorFn = config.modelComparatorFn;
  }

  function addChildToNode(node, child) {
    child.parent = node;
    node.children.push(child);
    return child;
  }

  function Node(config, model) {
    this.config = config;
    this.model = model;
    this.children = [];
  }

  TreeModel.prototype.parse = function (model) {
    var i, childCount, node;

    if (!(model instanceof Object)) {
      throw new TypeError('Model must be of type object.');
    }

    node = new Node(this.config, model);
    if (model[this.config.childrenPropertyName] instanceof Array) {
      if (this.config.modelComparatorFn) {
        model[this.config.childrenPropertyName] = mergeSort(
          this.config.modelComparatorFn,
          model[this.config.childrenPropertyName]);
      }
      for (i = 0, childCount = model[this.config.childrenPropertyName].length; i < childCount; i++) {
        addChildToNode(node, this.parse(model[this.config.childrenPropertyName][i]));
      }
    }
    return node;
  };

  function hasComparatorFunction(node) {
    return typeof node.config.modelComparatorFn === 'function';
  }

  Node.prototype.isRoot = function () {
    return this.parent === undefined;
  };

  Node.prototype.hasChildren = function () {
    return this.children.length > 0;
  };

  function addChild(self, child, insertIndex) {
    var index;

    if (!(child instanceof Node)) {
      throw new TypeError('Child must be of type Node.');
    }

    child.parent = self;
    if (!(self.model[self.config.childrenPropertyName] instanceof Array)) {
      self.model[self.config.childrenPropertyName] = [];
    }

    if (hasComparatorFunction(self)) {
      // Find the index to insert the child
      index = findInsertIndex(
          self.config.modelComparatorFn,
          self.model[self.config.childrenPropertyName],
          child.model);

      // Add to the model children
      self.model[self.config.childrenPropertyName].splice(index, 0, child.model);

      // Add to the node children
      self.children.splice(index, 0, child);
    } else {
      if (insertIndex === undefined) {
        self.model[self.config.childrenPropertyName].push(child.model);
        self.children.push(child);
      } else {
        if (insertIndex < 0 || insertIndex > self.children.length) {
          throw new Error('Invalid index.');
        }
        self.model[self.config.childrenPropertyName].splice(insertIndex, 0, child.model);
        self.children.splice(insertIndex, 0, child);
      }
    }
    return child;
  }

  Node.prototype.addChild = function (child) {
    return addChild(this, child);
  };

  Node.prototype.addChildAtIndex = function (child, index) {
    if (hasComparatorFunction(this)) {
      throw new Error('Cannot add child at index when using a comparator function.');
    }

    return addChild(this, child, index);
  };

  Node.prototype.setIndex = function (index) {
    if (hasComparatorFunction(this)) {
      throw new Error('Cannot set node index when using a comparator function.');
    }

    if (this.isRoot()) {
      if (index === 0) {
        return this;
      }
      throw new Error('Invalid index.');
    }

    if (index < 0 || index >= this.parent.children.length) {
      throw new Error('Invalid index.');
    }

    var oldIndex = this.parent.children.indexOf(this);

    this.parent.children.splice(index, 0, this.parent.children.splice(oldIndex, 1)[0]);

    this.parent.model[this.parent.config.childrenPropertyName]
    .splice(index, 0, this.parent.model[this.parent.config.childrenPropertyName].splice(oldIndex, 1)[0]);

    return this;
  };

  Node.prototype.getPath = function () {
    var path = [];
    (function addToPath(node) {
      path.unshift(node);
      if (!node.isRoot()) {
        addToPath(node.parent);
      }
    })(this);
    return path;
  };

  Node.prototype.getIndex = function () {
    if (this.isRoot()) {
      return 0;
    }
    return this.parent.children.indexOf(this);
  };

  /**
   * Parse the arguments of traversal functions. These functions can take one optional
   * first argument which is an options object. If present, this object will be stored
   * in args.options. The only mandatory argument is the callback function which can
   * appear in the first or second position (if an options object is given). This
   * function will be saved to args.fn. The last optional argument is the context on
   * which the callback function will be called. It will be available in args.ctx.
   *
   * @returns Parsed arguments.
   */
  function parseArgs() {
    var args = {};
    if (arguments.length === 1) {
      if (typeof arguments[0] === 'function') {
        args.fn = arguments[0];
      } else {
        args.options = arguments[0];
      }
    } else if (arguments.length === 2) {
      if (typeof arguments[0] === 'function') {
        args.fn = arguments[0];
        args.ctx = arguments[1];
      } else {
        args.options = arguments[0];
        args.fn = arguments[1];
      }
    } else {
      args.options = arguments[0];
      args.fn = arguments[1];
      args.ctx = arguments[2];
    }
    args.options = args.options || {};
    if (!args.options.strategy) {
      args.options.strategy = 'pre';
    }
    if (!walkStrategies[args.options.strategy]) {
      throw new Error('Unknown tree walk strategy. Valid strategies are \'pre\' [default], \'post\' and \'breadth\'.');
    }
    return args;
  }

  Node.prototype.walk = function () {
    var args;
    args = parseArgs.apply(this, arguments);
    walkStrategies[args.options.strategy].call(this, args.fn, args.ctx);
  };

  walkStrategies.pre = function depthFirstPreOrder(callback, context) {
    var i, childCount, keepGoing;
    keepGoing = callback.call(context, this);
    for (i = 0, childCount = this.children.length; i < childCount; i++) {
      if (keepGoing === false) {
        return false;
      }
      keepGoing = depthFirstPreOrder.call(this.children[i], callback, context);
    }
    return keepGoing;
  };

  walkStrategies.post = function depthFirstPostOrder(callback, context) {
    var i, childCount, keepGoing;
    for (i = 0, childCount = this.children.length; i < childCount; i++) {
      keepGoing = depthFirstPostOrder.call(this.children[i], callback, context);
      if (keepGoing === false) {
        return false;
      }
    }
    keepGoing = callback.call(context, this);
    return keepGoing;
  };

  walkStrategies.breadth = function breadthFirst(callback, context) {
    var queue = [this];
    (function processQueue() {
      var i, childCount, node;
      if (queue.length === 0) {
        return;
      }
      node = queue.shift();
      for (i = 0, childCount = node.children.length; i < childCount; i++) {
        queue.push(node.children[i]);
      }
      if (callback.call(context, node) !== false) {
        processQueue();
      }
    })();
  };

  Node.prototype.all = function () {
    var args, all = [];
    args = parseArgs.apply(this, arguments);
    args.fn = args.fn || k(true);
    walkStrategies[args.options.strategy].call(this, function (node) {
      if (args.fn.call(args.ctx, node)) {
        all.push(node);
      }
    }, args.ctx);
    return all;
  };

  Node.prototype.first = function () {
    var args, first;
    args = parseArgs.apply(this, arguments);
    args.fn = args.fn || k(true);
    walkStrategies[args.options.strategy].call(this, function (node) {
      if (args.fn.call(args.ctx, node)) {
        first = node;
        return false;
      }
    }, args.ctx);
    return first;
  };

  Node.prototype.drop = function () {
    var indexOfChild;
    if (!this.isRoot()) {
      indexOfChild = this.parent.children.indexOf(this);
      this.parent.children.splice(indexOfChild, 1);
      this.parent.model[this.config.childrenPropertyName].splice(indexOfChild, 1);
      this.parent = undefined;
      delete this.parent;
    }
    return this;
  };

  return TreeModel;
})();

},{"find-insert-index":2,"mergesort":3}],2:[function(require,module,exports){
module.exports = (function () {
  'use strict';

  /**
   * Find the index to insert an element in array keeping the sort order.
   *
   * @param {function} comparatorFn The comparator function which sorted the array.
   * @param {array} arr The sorted array.
   * @param {object} el The element to insert.
   */
  function findInsertIndex(comparatorFn, arr, el) {
    var i, len;
    for (i = 0, len = arr.length; i < len; i++) {
      if (comparatorFn(arr[i], el) > 0) {
        break;
      }
    }
    return i;
  }

  return findInsertIndex;
})();

},{}],3:[function(require,module,exports){
module.exports = (function () {
  'use strict';

  /**
   * Sort an array using the merge sort algorithm.
   *
   * @param {function} comparatorFn The comparator function.
   * @param {array} arr The array to sort.
   * @returns {array} The sorted array.
   */
  function mergeSort(comparatorFn, arr) {
    var len = arr.length, firstHalf, secondHalf;
    if (len >= 2) {
      firstHalf = arr.slice(0, len / 2);
      secondHalf = arr.slice(len / 2, len);
      return merge(comparatorFn, mergeSort(comparatorFn, firstHalf), mergeSort(comparatorFn, secondHalf));
    } else {
      return arr.slice();
    }
  }

  /**
   * The merge part of the merge sort algorithm.
   *
   * @param {function} comparatorFn The comparator function.
   * @param {array} arr1 The first sorted array.
   * @param {array} arr2 The second sorted array.
   * @returns {array} The merged and sorted array.
   */
  function merge(comparatorFn, arr1, arr2) {
    var result = [], left1 = arr1.length, left2 = arr2.length;
    while (left1 > 0 && left2 > 0) {
      if (comparatorFn(arr1[0], arr2[0]) <= 0) {
        result.push(arr1.shift());
        left1--;
      } else {
        result.push(arr2.shift());
        left2--;
      }
    }
    if (left1 > 0) {
      result.push.apply(result, arr1);
    } else {
      result.push.apply(result, arr2);
    }
    return result;
  }

  return mergeSort;
})();

},{}],4:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Base64 = function () {
  function Base64() {
    _classCallCheck(this, Base64);
  }

  _createClass(Base64, null, [{
    key: "encode",
    value: function encode(arr) {
      var i = 0,
          tbl = { 64: 61, 63: 95, 62: 45 };
      for (; i < 62; i++) {
        tbl[i] = i < 26 ? i + 65 : i < 52 ? i + 71 : i - 4;
      }
      var len, str;
      if (!arr || !arr.length) {
        return "";
      }
      for (i = 0, len = arr.length, str = ""; i < len; i += 3) {
        str += String.fromCharCode(tbl[arr[i] >>> 2], tbl[(arr[i] & 3) << 4 | arr[i + 1] >>> 4], tbl[i + 1 < len ? (arr[i + 1] & 15) << 2 | arr[i + 2] >>> 6 : 64], tbl[i + 2 < len ? arr[i + 2] & 63 : 64]);
      }
      return str;
    }
  }, {
    key: "decode",
    value: function decode(str) {
      var i = 0,
          tbl = { 61: 64, 95: 63, 45: 62 };
      for (; i < 62; i++) {
        tbl[i < 26 ? i + 65 : i < 52 ? i + 71 : i - 4] = i;
      }
      var j, len, arr, buf;
      if (!str || !str.length) {
        return [];
      }
      for (i = 0, len = str.length, arr = [], buf = []; i < len; i += 4) {
        for (j = 0; j < 4; j++) {
          buf[j] = tbl[str.charCodeAt(i + j) || 0];
        }
        arr.push(buf[0] << 2 | (buf[1] & 63) >>> 4, (buf[1] & 15) << 4 | (buf[2] & 63) >>> 2, (buf[2] & 3) << 6 | buf[3] & 63);
      }
      if (buf[3] === 64) {
        arr.pop();if (buf[2] === 64) {
          arr.pop();
        }
      }
      return arr;
    }
  }]);

  return Base64;
}();

exports.default = Base64;

},{}],5:[function(require,module,exports){
module.exports=[{"id":"1","type":"キュート","name":"島村卯月","birthday":"4月24日","age":"17歳","age_num":17,"height_num":159,"weight":"45kg","bust":"83","waist":"59","hip":"87","constellation":"牡牛座","bloodtype":"O型","handedness":"右","birthplace":"東京"},{"id":"2","type":"キュート","name":"中野有香","birthday":"3月23日","age":"18歳","age_num":18,"height_num":149,"weight":"40kg","bust":"77","waist":"57","hip":"81","constellation":"牡羊座","bloodtype":"B型","handedness":"右","birthplace":"東京"},{"id":"3","type":"キュート","name":"水本ゆかり","birthday":"10月18日","age":"15歳","age_num":15,"height_num":155,"weight":"42kg","bust":"81","waist":"56","hip":"82","constellation":"天秤座","bloodtype":"A型","handedness":"右","birthplace":"青森"},{"id":"4","type":"キュート","name":"福山舞","birthday":"1月21日","age":"10歳","age_num":10,"height_num":132,"weight":"28kg","bust":"64","waist":"56","hip":"70","constellation":"水瓶座","bloodtype":"O型","handedness":"左","birthplace":"兵庫"},{"id":"5","type":"キュート","name":"椎名法子","birthday":"10月10日","age":"13歳","age_num":13,"height_num":147,"weight":"38kg","bust":"76","waist":"55","hip":"79","constellation":"天秤座","bloodtype":"O型","handedness":"右","birthplace":"大阪"},{"id":"6","type":"キュート","name":"今井加奈","birthday":"3月3日","age":"16歳","age_num":16,"height_num":153,"weight":"41kg","bust":"81","waist":"56","hip":"79","constellation":"魚座","bloodtype":"O型","handedness":"右","birthplace":"高知"},{"id":"7","type":"キュート","name":"持田亜里沙","birthday":"8月24日","age":"21歳","age_num":21,"height_num":156,"weight":"45kg","bust":"77","waist":"54","hip":"76","constellation":"乙女座","bloodtype":"AB型","handedness":"右","birthplace":"長野"},{"id":"8","type":"キュート","name":"三村かな子","birthday":"1月6日","age":"17歳","age_num":17,"height_num":153,"weight":"52kg","bust":"90","waist":"65","hip":"89","constellation":"山羊座","bloodtype":"O型","handedness":"右","birthplace":"東京"},{"id":"9","type":"キュート","name":"奥山沙織","birthday":"6月12日","age":"19歳","age_num":19,"height_num":156,"weight":"47kg","bust":"83","waist":"57","hip":"81","constellation":"双子座","bloodtype":"B型","handedness":"右","birthplace":"秋田"},{"id":"10","type":"キュート","name":"間中美里","birthday":"11月6日","age":"20歳","age_num":20,"height_num":160,"weight":"46kg","bust":"84","waist":"57","hip":"85","constellation":"蠍座","bloodtype":"AB型","handedness":"右","birthplace":"神奈川"},{"id":"11","type":"キュート","name":"小日向美穂","birthday":"12月16日","age":"17歳","age_num":17,"height_num":155,"weight":"42kg","bust":"82","waist":"59","hip":"86","constellation":"射手座","bloodtype":"O型","handedness":"左","birthplace":"熊本"},{"id":"12","type":"キュート","name":"緒方智絵里","birthday":"6月11日","age":"16歳","age_num":16,"height_num":153,"weight":"42kg","bust":"79","waist":"57","hip":"80","constellation":"双子座","bloodtype":"A型","handedness":"右","birthplace":"三重"},{"id":"13","type":"キュート","name":"五十嵐響子","birthday":"8月10日","age":"15歳","age_num":15,"height_num":154,"weight":"43kg","bust":"81","waist":"58","hip":"80","constellation":"獅子座","bloodtype":"AB型","handedness":"右","birthplace":"鳥取"},{"id":"14","type":"キュート","name":"柳瀬美由紀","birthday":"3月16日","age":"14歳","age_num":14,"height_num":144,"weight":"33kg","bust":"75","waist":"54","hip":"77","constellation":"魚座","bloodtype":"O型","handedness":"右","birthplace":"北海道"},{"id":"15","type":"キュート","name":"櫻井桃華","birthday":"4月8日","age":"12歳","age_num":12,"height_num":145,"weight":"39kg","bust":"72","waist":"53","hip":"75","constellation":"牡羊座","bloodtype":"A型","handedness":"右","birthplace":"神戸"},{"id":"16","type":"キュート","name":"江上椿","birthday":"2月6日","age":"19歳","age_num":19,"height_num":161,"weight":"46kg","bust":"80","waist":"57","hip":"80","constellation":"水瓶座","bloodtype":"A型","handedness":"左","birthplace":"新潟"},{"id":"17","type":"キュート","name":"長富蓮実","birthday":"3月19日","age":"16歳","age_num":16,"height_num":161,"weight":"45kg","bust":"83","waist":"56","hip":"85","constellation":"魚座","bloodtype":"A型","handedness":"右","birthplace":"島根"},{"id":"18","type":"キュート","name":"横山千佳","birthday":"12月18日","age":"9歳","age_num":9,"height_num":127,"weight":"31kg","bust":"60","waist":"55","hip":"65","constellation":"射手座","bloodtype":"A型","handedness":"右","birthplace":"宮崎"},{"id":"19","type":"キュート","name":"関裕美","birthday":"8月17日","age":"14歳","age_num":14,"height_num":155,"weight":"43kg","bust":"78","waist":"55","hip":"80","constellation":"獅子座","bloodtype":"A型","handedness":"右","birthplace":"富山"},{"id":"20","type":"キュート","name":"太田優","birthday":"1月28日","age":"21歳","age_num":21,"height_num":159,"weight":"45kg","bust":"89","waist":"57","hip":"87","constellation":"水瓶座","bloodtype":"AB型","handedness":"両","birthplace":"千葉"},{"id":"21","type":"キュート","name":"棟方愛海","birthday":"8月1日","age":"14歳","age_num":14,"height_num":151,"weight":"41kg","bust":"73","waist":"56","hip":"75","constellation":"獅子座","bloodtype":"A型","handedness":"両","birthplace":"青森"},{"id":"22","type":"キュート","name":"藤本里奈","birthday":"10月14日","age":"18歳","age_num":18,"height_num":154,"weight":"41kg","bust":"77","waist":"55","hip":"80","constellation":"天秤座","bloodtype":"A型","handedness":"右","birthplace":"湘南"},{"id":"23","type":"キュート","name":"大原みちる","birthday":"4月12日","age":"15歳","age_num":15,"height_num":153,"weight":"40kg","bust":"78","waist":"55","hip":"80","constellation":"牡羊座","bloodtype":"O型","handedness":"右","birthplace":"福井"},{"id":"24","type":"キュート","name":"遊佐こずえ","birthday":"2月19日","age":"11歳","age_num":11,"height_num":130,"weight":"28kg","bust":"62","waist":"50","hip":"65","constellation":"魚座","bloodtype":"B型","handedness":"右","birthplace":"高知"},{"id":"25","type":"キュート","name":"大沼くるみ","birthday":"3月30日","age":"13歳","age_num":13,"height_num":145,"weight":"40kg","bust":"おっきい","waist":"ふつう","hip":"まぁまぁ","constellation":"牡羊座","bloodtype":"A型","handedness":"右","birthplace":"石川"},{"id":"26","type":"キュート","name":"一ノ瀬志希","birthday":"5月30日","age":"18歳","age_num":18,"height_num":161,"weight":"43kg","bust":"83","waist":"57","hip":"82","constellation":"双子座","bloodtype":"O型","handedness":"右","birthplace":"岩手"},{"id":"27","type":"キュート","name":"前川みく","birthday":"2月22日","age":"15歳","age_num":15,"height_num":152,"weight":"45kg","bust":"85","waist":"55","hip":"81","constellation":"魚座","bloodtype":"B型","handedness":"右","birthplace":"大阪"},{"id":"28","type":"キュート","name":"赤西瑛梨華","birthday":"7月7日","age":"16歳","age_num":16,"height_num":154,"weight":"55kg","bust":"92","waist":"59","hip":"88","constellation":"蟹座","bloodtype":"O型","handedness":"両","birthplace":"岡山"},{"id":"29","type":"キュート","name":"松原早耶","birthday":"12月28日","age":"18歳","age_num":18,"height_num":156,"weight":"43kg","bust":"83","waist":"58","hip":"86","constellation":"山羊座","bloodtype":"AB型","handedness":"右","birthplace":"兵庫"},{"id":"30","type":"キュート","name":"相原雪乃","birthday":"2月14日","age":"22歳","age_num":22,"height_num":160,"weight":"51kg","bust":"92","waist":"58","hip":"90","constellation":"水瓶座","bloodtype":"A型","handedness":"左","birthplace":"秋田"},{"id":"31","type":"キュート","name":"宮本フレデリカ","birthday":"2月14日","age":"19歳","age_num":19,"height_num":164,"weight":"46kg","bust":"83","waist":"57","hip":"85","constellation":"水瓶座","bloodtype":"B型","handedness":"左","birthplace":"ﾊﾟﾘ"},{"id":"32","type":"キュート","name":"小早川紗枝","birthday":"10月18日","age":"15歳","age_num":15,"height_num":148,"weight":"42kg","bust":"78","waist":"56","hip":"80","constellation":"天秤座","bloodtype":"AB型","handedness":"右","birthplace":"京都"},{"id":"33","type":"キュート","name":"西園寺琴歌","birthday":"1月23日","age":"17歳","age_num":17,"height_num":156,"weight":"46kg","bust":"87","waist":"57","hip":"85","constellation":"水瓶座","bloodtype":"O型","handedness":"右","birthplace":"東京"},{"id":"34","type":"キュート","name":"双葉杏","birthday":"9月2日","age":"17歳","age_num":17,"height_num":139,"weight":"30kg","bust":"?","waist":"?","hip":"?","constellation":"花も恥らう乙女座","bloodtype":"B型","handedness":"右","birthplace":"北海道"},{"id":"35","type":"キュート","name":"楊菲菲","birthday":"9月29日","age":"15歳","age_num":15,"height_num":152,"weight":"41kg","bust":"82","waist":"58","hip":"84","constellation":"天秤座","bloodtype":"O型","handedness":"右","birthplace":"香港"},{"id":"36","type":"キュート","name":"桃井あずき","birthday":"7月7日","age":"15歳","age_num":15,"height_num":145,"weight":"40kg","bust":"80","waist":"55","hip":"78","constellation":"蟹座","bloodtype":"A型","handedness":"右","birthplace":"長野"},{"id":"37","type":"キュート","name":"涼宮星花","birthday":"8月28日","age":"19歳","age_num":19,"height_num":158,"weight":"45kg","bust":"82","waist":"57","hip":"83","constellation":"乙女座","bloodtype":"A型","handedness":"右","birthplace":"岐阜"},{"id":"38","type":"キュート","name":"月宮雅","birthday":"10月30日","age":"18歳","age_num":18,"height_num":153,"weight":"44kg","bust":"86","waist":"56","hip":"82","constellation":"蠍座","bloodtype":"B型","handedness":"右","birthplace":"東京"},{"id":"39","type":"キュート","name":"兵藤レナ","birthday":"10月3日","age":"27歳","age_num":27,"height_num":167,"weight":"48kg","bust":"92","waist":"56","hip":"84","constellation":"天秤座","bloodtype":"O型","handedness":"左","birthplace":"東京"},{"id":"40","type":"キュート","name":"丹羽仁美","birthday":"6月4日","age":"18歳","age_num":18,"height_num":157,"weight":"43kg","bust":"81","waist":"55","hip":"79","constellation":"双子座","bloodtype":"B型","handedness":"右","birthplace":"名古屋"},{"id":"41","type":"キュート","name":"道明寺歌鈴","birthday":"1月1日","age":"17歳","age_num":17,"height_num":155,"weight":"43kg","bust":"80","waist":"55","hip":"83","constellation":"山羊座","bloodtype":"A型","handedness":"右","birthplace":"奈良"},{"id":"42","type":"キュート","name":"柳清良","birthday":"5月12日","age":"23歳","age_num":23,"height_num":158,"weight":"47kg","bust":"85","waist":"58","hip":"86","constellation":"牡牛座","bloodtype":"O型","handedness":"右","birthplace":"愛媛"},{"id":"43","type":"キュート","name":"井村雪菜","birthday":"8月27日","age":"17歳","age_num":17,"height_num":163,"weight":"48kg","bust":"85","waist":"60","hip":"88","constellation":"乙女座","bloodtype":"AB型","handedness":"右","birthplace":"秋田"},{"id":"44","type":"キュート","name":"日下部若葉","birthday":"5月4日","age":"20歳","age_num":20,"height_num":148,"weight":"40kg","bust":"77","waist":"54","hip":"78","constellation":"牡牛座","bloodtype":"O型","handedness":"右","birthplace":"群馬"},{"id":"45","type":"キュート","name":"榊原里美","birthday":"8月27日","age":"17歳","age_num":17,"height_num":162,"weight":"46kg","bust":"91","waist":"56","hip":"86","constellation":"乙女座","bloodtype":"O型","handedness":"右","birthplace":"山形"},{"id":"46","type":"キュート","name":"輿水幸子","birthday":"11月25日","age":"14歳","age_num":14,"height_num":142,"weight":"37kg","bust":"74","waist":"52","hip":"75","constellation":"射手座","bloodtype":"B型","handedness":"左","birthplace":"山梨"},{"id":"47","type":"キュート","name":"安斎都","birthday":"1月6日","age":"16歳","age_num":16,"height_num":156,"weight":"41kg","bust":"78","waist":"55","hip":"77","constellation":"山羊座","bloodtype":"B型","handedness":"右","birthplace":"福井"},{"id":"48","type":"キュート","name":"浅野風香","birthday":"2月11日","age":"16歳","age_num":16,"height_num":160,"weight":"48kg","bust":"88","waist":"59","hip":"84","constellation":"水瓶座","bloodtype":"A型","handedness":"右","birthplace":"滋賀"},{"id":"49","type":"キュート","name":"大西由里子","birthday":"3月20日","age":"20歳","age_num":20,"height_num":156,"weight":"44kg","bust":"81","waist":"58","hip":"83","constellation":"魚座","bloodtype":"O型","handedness":"右","birthplace":"香川"},{"id":"50","type":"キュート","name":"安部菜々","birthday":"5月15日","age":"永遠の17歳","age_num":27,"height_num":146,"weight":"40kg","bust":"84","waist":"57","hip":"84","constellation":"牡牛座","bloodtype":"O型","handedness":"右","birthplace":"ｳｻﾐﾝ星"},{"id":"51","type":"キュート","name":"工藤忍","birthday":"3月9日","age":"16歳","age_num":16,"height_num":154,"weight":"41kg","bust":"78","waist":"54","hip":"81","constellation":"魚座","bloodtype":"A型","handedness":"左","birthplace":"青森"},{"id":"52","type":"キュート","name":"栗原ネネ","birthday":"9月9日","age":"15歳","age_num":15,"height_num":161,"weight":"44kg","bust":"77","waist":"54","hip":"78","constellation":"乙女座","bloodtype":"A型","handedness":"右","birthplace":"群馬"},{"id":"53","type":"キュート","name":"古賀小春","birthday":"4月1日","age":"12歳","age_num":12,"height_num":140,"weight":"35kg","bust":"72","waist":"54","hip":"77","constellation":"牡羊座","bloodtype":"O型","handedness":"左","birthplace":"佐賀"},{"id":"54","type":"キュート","name":"クラリス","birthday":"8月26日","age":"20歳","age_num":20,"height_num":166,"weight":"45kg","bust":"80","waist":"55","hip":"82","constellation":"乙女座","bloodtype":"AB型","handedness":"右","birthplace":"兵庫"},{"id":"55","type":"キュート","name":"佐久間まゆ","birthday":"9月7日","age":"16歳","age_num":16,"height_num":153,"weight":"40kg","bust":"78","waist":"54","hip":"80","constellation":"乙女座","bloodtype":"B型","handedness":"両","birthplace":"仙台"},{"id":"56","type":"キュート","name":"村松さくら","birthday":"3月27日","age":"15歳","age_num":15,"height_num":145,"weight":"38kg","bust":"75","waist":"55","hip":"77","constellation":"牡羊座","bloodtype":"O型","handedness":"右","birthplace":"静岡"},{"id":"57","type":"キュート","name":"白菊ほたる","birthday":"4月19日","age":"13歳","age_num":13,"height_num":156,"weight":"42kg","bust":"77","waist":"53","hip":"79","constellation":"牡羊座","bloodtype":"AB型","handedness":"左","birthplace":"鳥取"},{"id":"58","type":"キュート","name":"早坂美玲","birthday":"5月9日","age":"14歳","age_num":14,"height_num":147,"weight":"39kg","bust":"75","waist":"54","hip":"77","constellation":"牡牛座","bloodtype":"B型","handedness":"右","birthplace":"宮城"},{"id":"59","type":"キュート","name":"有浦柑奈","birthday":"3月6日","age":"19歳","age_num":19,"height_num":155,"weight":"44kg","bust":"78","waist":"57","hip":"80","constellation":"魚座","bloodtype":"O型","handedness":"右","birthplace":"長崎"},{"id":"60","type":"キュート","name":"乙倉悠貴","birthday":"10月6日","age":"13歳","age_num":13,"height_num":164,"weight":"40kg","bust":"70","waist":"53","hip":"74","constellation":"天秤座","bloodtype":"A型","handedness":"右","birthplace":"岡山"},{"id":"61","type":"キュート","name":"原田美世","birthday":"11月14日","age":"20歳","age_num":20,"height_num":163,"weight":"46kg","bust":"86","waist":"59","hip":"85","constellation":"蠍座","bloodtype":"O型","handedness":"右","birthplace":"石川"},{"id":"62","type":"キュート","name":"池袋晶葉","birthday":"6月10日","age":"14歳","age_num":14,"height_num":148,"weight":"39kg","bust":"75","waist":"53","hip":"74","constellation":"双子座","bloodtype":"B型","handedness":"右","birthplace":"東京"},{"id":"63","type":"クール","name":"渋谷凛","birthday":"8月10日","age":"15歳","age_num":15,"height_num":165,"weight":"44kg","bust":"80","waist":"56","hip":"81","constellation":"獅子座","bloodtype":"B型","handedness":"右","birthplace":"東京"},{"id":"64","type":"クール","name":"黒川千秋","birthday":"2月26日","age":"20歳","age_num":20,"height_num":163,"weight":"45kg","bust":"86","waist":"57","hip":"86","constellation":"魚座","bloodtype":"B型","handedness":"右","birthplace":"北海道"},{"id":"65","type":"クール","name":"松本沙理奈","birthday":"9月1日","age":"22歳","age_num":22,"height_num":165,"weight":"48kg","bust":"92","waist":"58","hip":"85","constellation":"乙女座","bloodtype":"A型","handedness":"右","birthplace":"東京"},{"id":"66","type":"クール","name":"桐野アヤ","birthday":"4月8日","age":"19歳","age_num":19,"height_num":160,"weight":"43kg","bust":"86","waist":"56","hip":"86","constellation":"牡羊座","bloodtype":"A型","handedness":"右","birthplace":"福岡"},{"id":"67","type":"クール","name":"高橋礼子","birthday":"5月8日","age":"31歳","age_num":31,"height_num":167,"weight":"51kg","bust":"91","waist":"62","hip":"90","constellation":"牡牛座","bloodtype":"O型","handedness":"右","birthplace":"神奈川"},{"id":"68","type":"クール","name":"相川千夏","birthday":"11月11日","age":"23歳","age_num":23,"height_num":161,"weight":"43kg","bust":"82","waist":"56","hip":"85","constellation":"蠍座","bloodtype":"B型","handedness":"右","birthplace":"北海道"},{"id":"69","type":"クール","name":"川島瑞樹","birthday":"11月25日","age":"28歳","age_num":28,"height_num":159,"weight":"44kg","bust":"87","waist":"57","hip":"85","constellation":"射手座","bloodtype":"A型","handedness":"右","birthplace":"大阪"},{"id":"70","type":"クール","name":"神谷奈緒","birthday":"9月16日","age":"17歳","age_num":17,"height_num":154,"weight":"44kg","bust":"83","waist":"58","hip":"81","constellation":"乙女座","bloodtype":"AB型","handedness":"左","birthplace":"千葉"},{"id":"71","type":"クール","name":"上条春菜","birthday":"4月10日","age":"18歳","age_num":18,"height_num":156,"weight":"42kg","bust":"79","waist":"56","hip":"80","constellation":"牡羊座","bloodtype":"O型","handedness":"右","birthplace":"静岡"},{"id":"72","type":"クール","name":"荒木比奈","birthday":"4月9日","age":"20歳","age_num":20,"height_num":157,"weight":"43kg","bust":"83","waist":"57","hip":"82","constellation":"牡羊座","bloodtype":"A型","handedness":"右","birthplace":"神奈川"},{"id":"73","type":"クール","name":"東郷あい","birthday":"2月7日","age":"23歳","age_num":23,"height_num":167,"weight":"45kg","bust":"82","waist":"57","hip":"83","constellation":"水瓶座","bloodtype":"AB型","handedness":"両","birthplace":"福島"},{"id":"74","type":"クール","name":"多田李衣菜","birthday":"6月30日","age":"17歳","age_num":17,"height_num":152,"weight":"41kg","bust":"80","waist":"55","hip":"81","constellation":"蟹座","bloodtype":"A型","handedness":"右","birthplace":"東京"},{"id":"75","type":"クール","name":"水木聖來","birthday":"4月27日","age":"23歳","age_num":23,"height_num":155,"weight":"43kg","bust":"82","waist":"55","hip":"80","constellation":"牡牛座","bloodtype":"B型","handedness":"右","birthplace":"茨城"},{"id":"76","type":"クール","name":"佐々木千枝","birthday":"6月7日","age":"11歳","age_num":11,"height_num":139,"weight":"33kg","bust":"73","waist":"49","hip":"73","constellation":"双子座","bloodtype":"AB型","handedness":"左","birthplace":"富山"},{"id":"77","type":"クール","name":"三船美優","birthday":"2月25日","age":"26歳","age_num":26,"height_num":165,"weight":"46kg","bust":"85","waist":"60","hip":"85","constellation":"魚座","bloodtype":"AB型","handedness":"右","birthplace":"岩手"},{"id":"78","type":"クール","name":"服部瞳子","birthday":"10月11日","age":"25歳","age_num":25,"height_num":169,"weight":"48kg","bust":"78","waist":"57","hip":"80","constellation":"天秤座","bloodtype":"O型","handedness":"左","birthplace":"大分"},{"id":"79","type":"クール","name":"木場真奈美","birthday":"8月8日","age":"25歳","age_num":25,"height_num":172,"weight":"50kg","bust":"88","waist":"60","hip":"89","constellation":"獅子座","bloodtype":"AB型","handedness":"右","birthplace":"長崎"},{"id":"80","type":"クール","name":"藤原肇","birthday":"6月15日","age":"16歳","age_num":16,"height_num":161,"weight":"43kg","bust":"80","waist":"55","hip":"84","constellation":"双子座","bloodtype":"B型","handedness":"両","birthplace":"岡山"},{"id":"81","type":"クール","name":"新田美波","birthday":"7月27日","age":"19歳","age_num":19,"height_num":165,"weight":"45kg","bust":"82","waist":"55","hip":"85","constellation":"獅子座","bloodtype":"O型","handedness":"右","birthplace":"広島"},{"id":"82","type":"クール","name":"水野翠","birthday":"12月5日","age":"18歳","age_num":18,"height_num":164,"weight":"47kg","bust":"80","waist":"54","hip":"81","constellation":"射手座","bloodtype":"AB型","handedness":"右","birthplace":"愛知"},{"id":"83","type":"クール","name":"古澤頼子","birthday":"5月18日","age":"17歳","age_num":17,"height_num":166,"weight":"45kg","bust":"81","waist":"59","hip":"83","constellation":"牡牛座","bloodtype":"A型","handedness":"左","birthplace":"茨城"},{"id":"84","type":"クール","name":"橘ありす","birthday":"7月31日","age":"12歳","age_num":12,"height_num":141,"weight":"34kg","bust":"68","waist":"52","hip":"67","constellation":"獅子座","bloodtype":"A型","handedness":"右","birthplace":"兵庫"},{"id":"85","type":"クール","name":"鷺沢文香","birthday":"10月27日","age":"19歳","age_num":19,"height_num":162,"weight":"45kg","bust":"84","waist":"54","hip":"81","constellation":"蠍座","bloodtype":"AB型","handedness":"右","birthplace":"長野"},{"id":"86","type":"クール","name":"八神マキノ","birthday":"11月7日","age":"18歳","age_num":18,"height_num":160,"weight":"45kg","bust":"85","waist":"56","hip":"83","constellation":"蠍座","bloodtype":"B型","handedness":"右","birthplace":"岐阜"},{"id":"87","type":"クール","name":"ライラ","birthday":"5月21日","age":"16歳","age_num":16,"height_num":150,"weight":"40kg","bust":"75","waist":"54","hip":"78","constellation":"双子座","bloodtype":"O型","handedness":"右","birthplace":"ﾄﾞﾊﾞｲ"},{"id":"88","type":"クール","name":"浅利七海","birthday":"10月9日","age":"14歳","age_num":14,"height_num":151,"weight":"41kg","bust":"78","waist":"55","hip":"77","constellation":"天秤座","bloodtype":"A型","handedness":"右","birthplace":"青森"},{"id":"89","type":"クール","name":"ヘレン","birthday":"4月4日","age":"24歳","age_num":24,"height_num":158,"weight":"46kg","bust":"90","waist":"58","hip":"81","constellation":"牡羊座","bloodtype":"AB型","handedness":"右","birthplace":"海の向こう"},{"id":"90","type":"クール","name":"松永涼","birthday":"10月1日","age":"18歳","age_num":18,"height_num":160,"weight":"47kg","bust":"90","waist":"56","hip":"86","constellation":"天秤座","bloodtype":"AB型","handedness":"右","birthplace":"東京"},{"id":"91","type":"クール","name":"小室千奈美","birthday":"6月9日","age":"19歳","age_num":19,"height_num":164,"weight":"45kg","bust":"84","waist":"56","hip":"82","constellation":"双子座","bloodtype":"AB型","handedness":"右","birthplace":"愛知"},{"id":"92","type":"クール","name":"高峯のあ","birthday":"3月25日","age":"24歳","age_num":24,"height_num":168,"weight":"48kg","bust":"87","waist":"55","hip":"86","constellation":"牡羊座","bloodtype":"B型","handedness":"右","birthplace":"奈良"},{"id":"93","type":"クール","name":"高垣楓","birthday":"6月14日","age":"25歳","age_num":25,"height_num":171,"weight":"49kg","bust":"81","waist":"57","hip":"83","constellation":"双子座","bloodtype":"AB型","handedness":"左","birthplace":"和歌山"},{"id":"94","type":"クール","name":"神崎蘭子","birthday":"4月8日","age":"14歳","age_num":14,"height_num":156,"weight":"41kg","bust":"81","waist":"57","hip":"80","constellation":"牡羊座","bloodtype":"A型","handedness":"右","birthplace":"熊本"},{"id":"95","type":"クール","name":"伊集院惠","birthday":"9月24日","age":"21歳","age_num":21,"height_num":160,"weight":"44kg","bust":"86","waist":"56","hip":"81","constellation":"天秤座","bloodtype":"O型","handedness":"左","birthplace":"東京"},{"id":"96","type":"クール","name":"柊志乃","birthday":"12月25日","age":"31歳","age_num":31,"height_num":167,"weight":"43kg","bust":"84","waist":"54","hip":"83","constellation":"山羊座","bloodtype":"AB型","handedness":"左","birthplace":"山梨"},{"id":"97","type":"クール","name":"北条加蓮","birthday":"9月5日","age":"16歳","age_num":16,"height_num":155,"weight":"42kg","bust":"83","waist":"55","hip":"81","constellation":"乙女座","bloodtype":"B型","handedness":"右","birthplace":"東京"},{"id":"98","type":"クール","name":"ケイト","birthday":"8月15日","age":"20歳","age_num":20,"height_num":157,"weight":"45kg","bust":"83","waist":"59","hip":"85","constellation":"獅子座","bloodtype":"O型","handedness":"右","birthplace":"ｲｷﾞﾘｽ"},{"id":"99","type":"クール","name":"瀬名詩織","birthday":"1月10日","age":"19歳","age_num":19,"height_num":165,"weight":"48kg","bust":"85","waist":"58","hip":"83","constellation":"山羊座","bloodtype":"A型","handedness":"右","birthplace":"沖縄"},{"id":"100","type":"クール","name":"綾瀬穂乃香","birthday":"5月29日","age":"17歳","age_num":17,"height_num":161,"weight":"46kg","bust":"85","waist":"57","hip":"84","constellation":"双子座","bloodtype":"A型","handedness":"右","birthplace":"宮城"},{"id":"101","type":"クール","name":"佐城雪美","birthday":"9月28日","age":"10歳","age_num":10,"height_num":137,"weight":"30kg","bust":"63","waist":"47","hip":"65","constellation":"天秤座","bloodtype":"AB型","handedness":"右","birthplace":"京都"},{"id":"102","type":"クール","name":"篠原礼","birthday":"11月22日","age":"27歳","age_num":27,"height_num":171,"weight":"49kg","bust":"93","waist":"58","hip":"88","constellation":"蠍座","bloodtype":"B型","handedness":"左","birthplace":"宮崎"},{"id":"103","type":"クール","name":"和久井留美","birthday":"4月7日","age":"26歳","age_num":26,"height_num":168,"weight":"49kg","bust":"81","waist":"60","hip":"86","constellation":"牡羊座","bloodtype":"A型","handedness":"左","birthplace":"広島"},{"id":"104","type":"クール","name":"吉岡沙紀","birthday":"5月8日","age":"17歳","age_num":17,"height_num":166,"weight":"43kg","bust":"86","waist":"60","hip":"85","constellation":"牡牛座","bloodtype":"A型","handedness":"右","birthplace":"神奈川"},{"id":"105","type":"クール","name":"梅木音葉","birthday":"6月20日","age":"19歳","age_num":19,"height_num":172,"weight":"49kg","bust":"86","waist":"58","hip":"85","constellation":"双子座","bloodtype":"AB型","handedness":"右","birthplace":"北海道"},{"id":"106","type":"クール","name":"白坂小梅","birthday":"3月28日","age":"13歳","age_num":13,"height_num":142,"weight":"34kg","bust":"65","waist":"50","hip":"70","constellation":"牡羊座","bloodtype":"AB型","handedness":"左","birthplace":"兵庫"},{"id":"107","type":"クール","name":"岸部彩華","birthday":"11月13日","age":"19歳","age_num":19,"height_num":162,"weight":"46kg","bust":"89","waist":"59","hip":"85","constellation":"蠍座","bloodtype":"A型","handedness":"右","birthplace":"埼玉"},{"id":"108","type":"クール","name":"氏家むつみ","birthday":"7月13日","age":"13歳","age_num":13,"height_num":152,"weight":"42kg","bust":"78","waist":"57","hip":"80","constellation":"蟹座","bloodtype":"AB型","handedness":"右","birthplace":"栃木"},{"id":"109","type":"クール","name":"西川保奈美","birthday":"10月23日","age":"16歳","age_num":16,"height_num":155,"weight":"55kg","bust":"88","waist":"60","hip":"86","constellation":"天秤座","bloodtype":"A型","handedness":"両","birthplace":"兵庫"},{"id":"110","type":"クール","name":"成宮由愛","birthday":"11月3日","age":"13歳","age_num":13,"height_num":150,"weight":"40kg","bust":"72","waist":"51","hip":"73","constellation":"蠍座","bloodtype":"AB型","handedness":"両","birthplace":"滋賀"},{"id":"111","type":"クール","name":"藤居朋","birthday":"7月1日","age":"19歳","age_num":19,"height_num":163,"weight":"45kg","bust":"78","waist":"57","hip":"83","constellation":"蟹座","bloodtype":"O型","handedness":"右","birthplace":"滋賀"},{"id":"112","type":"クール","name":"塩見周子","birthday":"12月12日","age":"18歳","age_num":18,"height_num":163,"weight":"45kg","bust":"82","waist":"56","hip":"81","constellation":"射手座","bloodtype":"B型","handedness":"左","birthplace":"京都"},{"id":"113","type":"クール","name":"脇山珠美","birthday":"9月20日","age":"16歳","age_num":16,"height_num":145,"weight":"38kg","bust":"72","waist":"53","hip":"75","constellation":"乙女座","bloodtype":"B型","handedness":"右","birthplace":"佐賀"},{"id":"114","type":"クール","name":"岡崎泰葉","birthday":"7月16日","age":"16歳","age_num":16,"height_num":153,"weight":"43kg","bust":"79","waist":"55","hip":"80","constellation":"蟹座","bloodtype":"A型","handedness":"左","birthplace":"長崎"},{"id":"115","type":"クール","name":"速水奏","birthday":"7月1日","age":"17歳","age_num":17,"height_num":162,"weight":"43kg","bust":"86","waist":"55","hip":"84","constellation":"蟹座","bloodtype":"O型","handedness":"右","birthplace":"東京"},{"id":"116","type":"クール","name":"大石泉","birthday":"11月11日","age":"15歳","age_num":15,"height_num":157,"weight":"41kg","bust":"83","waist":"55","hip":"82","constellation":"蠍座","bloodtype":"A型","handedness":"右","birthplace":"静岡"},{"id":"117","type":"クール","name":"松尾千鶴","birthday":"3月21日","age":"15歳","age_num":15,"height_num":161,"weight":"45kg","bust":"78","waist":"54","hip":"81","constellation":"牡羊座","bloodtype":"A型","handedness":"右","birthplace":"福岡"},{"id":"118","type":"クール","name":"森久保乃々","birthday":"8月27日","age":"14歳","age_num":14,"height_num":149,"weight":"38kg","bust":"73","waist":"55","hip":"76","constellation":"乙女座","bloodtype":"AB型","handedness":"左","birthplace":"神奈川"},{"id":"119","type":"クール","name":"アナスタシア","birthday":"9月19日","age":"15歳","age_num":15,"height_num":165,"weight":"43kg","bust":"80","waist":"54","hip":"80","constellation":"乙女座","bloodtype":"O型","handedness":"両","birthplace":"北海道"},{"id":"120","type":"クール","name":"大和亜季","birthday":"12月16日","age":"21歳","age_num":21,"height_num":165,"weight":"51kg","bust":"92","waist":"60","hip":"85","constellation":"射手座","bloodtype":"O型","handedness":"左","birthplace":"福岡"},{"id":"121","type":"クール","name":"結城晴","birthday":"7月17日","age":"12歳","age_num":12,"height_num":140,"weight":"37kg","bust":"74","waist":"55","hip":"78","constellation":"かに座","bloodtype":"A型","handedness":"右","birthplace":"愛媛"},{"id":"122","type":"クール","name":"二宮飛鳥","birthday":"2月3日","age":"14歳","age_num":14,"height_num":154,"weight":"42kg","bust":"75","waist":"55","hip":"78","constellation":"水瓶座","bloodtype":"B型","handedness":"右","birthplace":"静岡"},{"id":"123","type":"クール","name":"桐生つかさ","birthday":"2月24日","age":"18歳","age_num":18,"height_num":164,"weight":"45kg","bust":"83","waist":"55","hip":"82","constellation":"魚座","bloodtype":"A型","handedness":"右","birthplace":"福井"},{"id":"124","type":"クール","name":"望月聖","birthday":"12月25日","age":"13歳","age_num":13,"height_num":150,"weight":"37kg","bust":"82","waist":"59","hip":"86","constellation":"山羊座","bloodtype":"O型","handedness":"右","birthplace":"長野"},{"id":"125","type":"クール","name":"鷹富士茄子","birthday":"1月1日","age":"20歳","age_num":20,"height_num":160,"weight":"43kg","bust":"88","waist":"57","hip":"88","constellation":"山羊座","bloodtype":"AB型","handedness":"右","birthplace":"島根"},{"id":"126","type":"パッション","name":"本田未央","birthday":"12月1日","age":"15歳","age_num":15,"height_num":161,"weight":"46kg","bust":"84","waist":"58","hip":"87","constellation":"射手座","bloodtype":"B型","handedness":"右","birthplace":"千葉"},{"id":"127","type":"パッション","name":"高森藍子","birthday":"7月25日","age":"16歳","age_num":16,"height_num":155,"weight":"42kg","bust":"74","waist":"60","hip":"79","constellation":"獅子座","bloodtype":"O型","handedness":"右","birthplace":"東京"},{"id":"128","type":"パッション","name":"並木芽衣子","birthday":"10月14日","age":"22歳","age_num":22,"height_num":160,"weight":"44kg","bust":"80","waist":"57","hip":"82","constellation":"天秤座","bloodtype":"AB型","handedness":"右","birthplace":"和歌山"},{"id":"129","type":"パッション","name":"龍崎薫","birthday":"7月20日","age":"9歳","age_num":9,"height_num":132,"weight":"32kg","bust":"65","waist":"51","hip":"70","constellation":"蟹座","bloodtype":"O型","handedness":"右","birthplace":"愛媛"},{"id":"130","type":"パッション","name":"木村夏樹","birthday":"8月19日","age":"18歳","age_num":18,"height_num":159,"weight":"41kg","bust":"82","waist":"57","hip":"83","constellation":"獅子座","bloodtype":"AB型","handedness":"左","birthplace":"茨城"},{"id":"131","type":"パッション","name":"松山久美子","birthday":"1月21日","age":"21歳","age_num":21,"height_num":161,"weight":"44kg","bust":"81","waist":"56","hip":"81","constellation":"水瓶座","bloodtype":"A型","handedness":"右","birthplace":"神奈川"},{"id":"132","type":"パッション","name":"斉藤洋子","birthday":"12月29日","age":"20歳","age_num":20,"height_num":157,"weight":"46kg","bust":"85","waist":"57","hip":"82","constellation":"山羊座","bloodtype":"O型","handedness":"右","birthplace":"福岡"},{"id":"133","type":"パッション","name":"沢田麻理菜","birthday":"5月6日","age":"26歳","age_num":26,"height_num":166,"weight":"47kg","bust":"87","waist":"57","hip":"87","constellation":"牡牛座","bloodtype":"B型","handedness":"右","birthplace":"長野"},{"id":"134","type":"パッション","name":"矢口美羽","birthday":"7月10日","age":"14歳","age_num":14,"height_num":150,"weight":"41kg","bust":"81","waist":"56","hip":"80","constellation":"蟹座","bloodtype":"B型","handedness":"右","birthplace":"千葉"},{"id":"135","type":"パッション","name":"赤城みりあ","birthday":"4月14日","age":"11歳","age_num":11,"height_num":140,"weight":"36kg","bust":"75","waist":"55","hip":"78","constellation":"牡羊座","bloodtype":"AB型","handedness":"左","birthplace":"東京"},{"id":"136","type":"パッション","name":"愛野渚","birthday":"8月1日","age":"18歳","age_num":18,"height_num":163,"weight":"47kg","bust":"84","waist":"58","hip":"85","constellation":"獅子座","bloodtype":"A型","handedness":"右","birthplace":"愛知"},{"id":"137","type":"パッション","name":"真鍋いつき","birthday":"12月29日","age":"22歳","age_num":22,"height_num":165,"weight":"46kg","bust":"85","waist":"57","hip":"83","constellation":"山羊座","bloodtype":"O型","handedness":"右","birthplace":"石川"},{"id":"138","type":"パッション","name":"大槻唯","birthday":"5月7日","age":"17歳","age_num":17,"height_num":155,"weight":"42kg","bust":"84","waist":"56","hip":"83","constellation":"牡牛座","bloodtype":"B型","handedness":"左","birthplace":"埼玉"},{"id":"139","type":"パッション","name":"姫川友紀","birthday":"9月14日","age":"20歳","age_num":20,"height_num":161,"weight":"44kg","bust":"80","waist":"57","hip":"80","constellation":"乙女座","bloodtype":"A型","handedness":"右","birthplace":"宮崎"},{"id":"140","type":"パッション","name":"喜多見柚","birthday":"12月2日","age":"15歳","age_num":15,"height_num":156,"weight":"43kg","bust":"82","waist":"57","hip":"82","constellation":"射手座","bloodtype":"B型","handedness":"左","birthplace":"埼玉"},{"id":"141","type":"パッション","name":"上田鈴帆","birthday":"10月26日","age":"14歳","age_num":14,"height_num":156,"weight":"42kg","bust":"76","waist":"55","hip":"79","constellation":"蠍座","bloodtype":"O型","handedness":"右","birthplace":"福岡"},{"id":"142","type":"パッション","name":"海老原菜帆","birthday":"8月3日","age":"17歳","age_num":17,"height_num":162,"weight":"58kg","bust":"92","waist":"65","hip":"93","constellation":"獅子座","bloodtype":"O型","handedness":"右","birthplace":"熊本"},{"id":"143","type":"パッション","name":"及川雫","birthday":"6月3日","age":"16歳","age_num":16,"height_num":170,"weight":"56kg","bust":"105","waist":"64","hip":"92","constellation":"双子座","bloodtype":"O型","handedness":"両","birthplace":"岩手"},{"id":"144","type":"パッション","name":"小関麗奈","birthday":"3月5日","age":"13歳","age_num":13,"height_num":148,"weight":"41kg","bust":"75","waist":"50","hip":"77","constellation":"魚座","bloodtype":"B型","handedness":"右","birthplace":"山形"},{"id":"145","type":"パッション","name":"衛藤美紗希","birthday":"3月18日","age":"22歳","age_num":22,"height_num":160,"weight":"45kg","bust":"84","waist":"56","hip":"80","constellation":"魚座","bloodtype":"O型","handedness":"左","birthplace":"大分"},{"id":"146","type":"パッション","name":"星輝子","birthday":"6月6日","age":"15歳","age_num":15,"height_num":142,"weight":"35kg","bust":"73","waist":"53","hip":"75","constellation":"双子座","bloodtype":"B型","handedness":"左","birthplace":"福島"},{"id":"147","type":"パッション","name":"片桐早苗","birthday":"3月7日","age":"28歳","age_num":28,"height_num":152,"weight":"47kg","bust":"92","waist":"58","hip":"84","constellation":"魚座","bloodtype":"O型","handedness":"右","birthplace":"新潟"},{"id":"148","type":"パッション","name":"堀裕子","birthday":"3月13日","age":"16歳","age_num":16,"height_num":157,"weight":"44kg","bust":"81","waist":"58","hip":"80","constellation":"魚座","bloodtype":"O型","handedness":"右","birthplace":"福井"},{"id":"149","type":"パッション","name":"西島櫂","birthday":"8月17日","age":"19歳","age_num":19,"height_num":172,"weight":"49kg","bust":"86","waist":"59","hip":"83","constellation":"獅子座","bloodtype":"O型","handedness":"右","birthplace":"大阪"},{"id":"150","type":"パッション","name":"的場梨沙","birthday":"11月19日","age":"12歳","age_num":12,"height_num":143,"weight":"38kg","bust":"71","waist":"58","hip":"73","constellation":"蠍座","bloodtype":"B型","handedness":"右","birthplace":"山口"},{"id":"151","type":"パッション","name":"財前時子","birthday":"4月18日","age":"21歳","age_num":21,"height_num":168,"weight":"46kg","bust":"83","waist":"55","hip":"85","constellation":"牡羊座","bloodtype":"B型","handedness":"右","birthplace":"名古屋"},{"id":"152","type":"パッション","name":"依田芳乃","birthday":"7月3日","age":"16歳","age_num":16,"height_num":151,"weight":"40kg","bust":"73","waist":"53","hip":"73","constellation":"蟹座","bloodtype":"O型","handedness":"右","birthplace":"鹿児島"},{"id":"153","type":"パッション","name":"相葉夕美","birthday":"4月15日","age":"18歳","age_num":18,"height_num":158,"weight":"42kg","bust":"81","waist":"57","hip":"80","constellation":"牡羊座","bloodtype":"O型","handedness":"右","birthplace":"神奈川"},{"id":"154","type":"パッション","name":"野々村そら","birthday":"1月3日","age":"15歳","age_num":15,"height_num":157,"weight":"46kg","bust":"84","waist":"57","hip":"85","constellation":"山羊座","bloodtype":"B型","handedness":"右","birthplace":"福岡"},{"id":"155","type":"パッション","name":"浜川愛結奈","birthday":"5月25日","age":"22歳","age_num":22,"height_num":168,"weight":"50kg","bust":"92","waist":"58","hip":"85","constellation":"双子座","bloodtype":"B型","handedness":"右","birthplace":"大阪"},{"id":"156","type":"パッション","name":"若林智香","birthday":"8月30日","age":"17歳","age_num":17,"height_num":156,"weight":"45kg","bust":"82","waist":"57","hip":"83","constellation":"乙女座","bloodtype":"A型","handedness":"右","birthplace":"鹿児島"},{"id":"157","type":"パッション","name":"城ヶ崎美嘉","birthday":"11月12日","age":"17歳","age_num":17,"height_num":162,"weight":"43kg","bust":"80","waist":"56","hip":"82","constellation":"蠍座","bloodtype":"AB型","handedness":"左","birthplace":"埼玉"},{"id":"158","type":"パッション","name":"城ヶ崎莉嘉","birthday":"7月30日","age":"12歳","age_num":12,"height_num":149,"weight":"36kg","bust":"72","waist":"54","hip":"75","constellation":"獅子座","bloodtype":"B型","handedness":"左","birthplace":"埼玉"},{"id":"159","type":"パッション","name":"仙崎恵磨","birthday":"6月27日","age":"21歳","age_num":21,"height_num":156,"weight":"45kg","bust":"81","waist":"55","hip":"81","constellation":"蟹座","bloodtype":"O型","handedness":"左","birthplace":"大阪"},{"id":"160","type":"パッション","name":"日野茜","birthday":"8月4日","age":"17歳","age_num":17,"height_num":148,"weight":"40kg","bust":"80","waist":"60","hip":"82","constellation":"獅子座","bloodtype":"AB型","handedness":"右","birthplace":"栃木"},{"id":"161","type":"パッション","name":"諸星きらり","birthday":"9月1日","age":"17歳","age_num":17,"height_num":182,"weight":"60kg","bust":"91","waist":"64","hip":"86","constellation":"乙女座","bloodtype":"O型","handedness":"右","birthplace":"東京"},{"id":"162","type":"パッション","name":"十時愛梨","birthday":"12月8日","age":"18歳","age_num":18,"height_num":161,"weight":"46kg","bust":"86","waist":"58","hip":"88","constellation":"射手座","bloodtype":"O型","handedness":"右","birthplace":"秋田"},{"id":"163","type":"パッション","name":"ナターリア","birthday":"6月29日","age":"14歳","age_num":14,"height_num":155,"weight":"43kg","bust":"84","waist":"55","hip":"86","constellation":"蟹座","bloodtype":"A型","handedness":"右","birthplace":"ﾘｵ･ﾃﾞ･ｼﾞｬﾈｲﾛ"},{"id":"164","type":"パッション","name":"相馬夏美","birthday":"7月23日","age":"25歳","age_num":25,"height_num":160,"weight":"46kg","bust":"83","waist":"60","hip":"89","constellation":"獅子座","bloodtype":"A型","handedness":"右","birthplace":"京都"},{"id":"165","type":"パッション","name":"槙原志保","birthday":"4月27日","age":"19歳","age_num":19,"height_num":162,"weight":"46kg","bust":"86","waist":"57","hip":"91","constellation":"牡牛座","bloodtype":"B型","handedness":"右","birthplace":"三重"},{"id":"166","type":"パッション","name":"向井拓海","birthday":"8月7日","age":"18歳","age_num":18,"height_num":163,"weight":"53kg","bust":"95","waist":"60","hip":"87","constellation":"獅子座","bloodtype":"A型","handedness":"右","birthplace":"神奈川"},{"id":"167","type":"パッション","name":"市原仁奈","birthday":"2月8日","age":"9歳","age_num":9,"height_num":128,"weight":"29kg","bust":"61","waist":"57","hip":"67","constellation":"水瓶座","bloodtype":"B型","handedness":"左","birthplace":"静岡"},{"id":"168","type":"パッション","name":"杉坂海","birthday":"7月20日","age":"18歳","age_num":18,"height_num":162,"weight":"45kg","bust":"88","waist":"58","hip":"86","constellation":"蟹座","bloodtype":"B型","handedness":"右","birthplace":"山口"},{"id":"169","type":"パッション","name":"喜多日菜子","birthday":"4月6日","age":"15歳","age_num":15,"height_num":151,"weight":"38kg","bust":"78","waist":"56","hip":"78","constellation":"牡羊座","bloodtype":"AB型","handedness":"右","birthplace":"秋田"},{"id":"170","type":"パッション","name":"北川真尋","birthday":"2月17日","age":"17歳","age_num":17,"height_num":158,"weight":"43kg","bust":"75","waist":"57","hip":"79","constellation":"水瓶座","bloodtype":"O型","handedness":"右","birthplace":"香川"},{"id":"171","type":"パッション","name":"小松伊吹","birthday":"11月17日","age":"19歳","age_num":19,"height_num":165,"weight":"48kg","bust":"85","waist":"59","hip":"88","constellation":"蠍座","bloodtype":"O型","handedness":"右","birthplace":"茨城"},{"id":"172","type":"パッション","name":"メアリー・コクラン","birthday":"1月19日","age":"11歳","age_num":11,"height_num":152,"weight":"41kg","bust":"71","waist":"59","hip":"73","constellation":"山羊座","bloodtype":"B型","handedness":"左","birthplace":"ｻﾝﾌﾗﾝｼｽｺ"},{"id":"173","type":"パッション","name":"三好紗南","birthday":"6月25日","age":"14歳","age_num":14,"height_num":149,"weight":"39kg","bust":"75","waist":"56","hip":"80","constellation":"蟹座","bloodtype":"B型","handedness":"右","birthplace":"香川"},{"id":"174","type":"パッション","name":"キャシー・グラハム","birthday":"9月19日","age":"15歳","age_num":15,"height_num":168,"weight":"49kg","bust":"83","waist":"56","hip":"85","constellation":"乙女座","bloodtype":"O型","handedness":"左","birthplace":"ﾆｭｰﾖｰｸ"},{"id":"175","type":"パッション","name":"難波笑美","birthday":"5月1日","age":"17歳","age_num":17,"height_num":158,"weight":"45kg","bust":"82","waist":"56","hip":"80","constellation":"牡牛座","bloodtype":"O型","handedness":"右","birthplace":"大阪"},{"id":"176","type":"パッション","name":"浜口あやめ","birthday":"1月13日","age":"15歳","age_num":15,"height_num":154,"weight":"42kg","bust":"78","waist":"55","hip":"80","constellation":"山羊座","bloodtype":"A型","handedness":"左","birthplace":"三重"},{"id":"177","type":"パッション","name":"村上巴","birthday":"1月3日","age":"13歳","age_num":13,"height_num":146,"weight":"37kg","bust":"74","waist":"53","hip":"76","constellation":"山羊座","bloodtype":"A型","handedness":"右","birthplace":"広島"},{"id":"178","type":"パッション","name":"土屋亜子","birthday":"5月2日","age":"15歳","age_num":15,"height_num":156,"weight":"42kg","bust":"85","waist":"54","hip":"83","constellation":"牡牛座","bloodtype":"B型","handedness":"右","birthplace":"静岡"},{"id":"179","type":"パッション","name":"首藤葵","birthday":"8月18日","age":"13歳","age_num":13,"height_num":145,"weight":"39kg","bust":"73","waist":"53","hip":"75","constellation":"獅子座","bloodtype":"O型","handedness":"右","birthplace":"大分"},{"id":"180","type":"パッション","name":"冴島清美","birthday":"9月26日","age":"15歳","age_num":15,"height_num":153,"weight":"43kg","bust":"76","waist":"58","hip":"78","constellation":"天秤座","bloodtype":"A型","handedness":"右","birthplace":"沖縄"},{"id":"181","type":"パッション","name":"佐藤心","birthday":"7月22日","age":"26歳","age_num":26,"height_num":166,"weight":"ダイエットちゅう","bust":"ぼんっ","waist":"きゅっ","hip":"ぼんっ♪","constellation":"蟹座","bloodtype":"AB型","handedness":"右","birthplace":"長野"},{"id":"182","type":"パッション","name":"南条光","birthday":"9月13日","age":"14歳","age_num":14,"height_num":140,"weight":"41kg","bust":"79","waist":"58","hip":"80","constellation":"乙女座","bloodtype":"B型","handedness":"右","birthplace":"徳島"},{"id":"183","type":"パッション","name":"イヴ・サンタクロース","birthday":"12月24日","age":"19歳","age_num":19,"height_num":165,"weight":"44kg","bust":"81","waist":"56","hip":"80","constellation":"山羊座","bloodtype":"B型","handedness":"右","birthplace":"ｸﾞﾘｰﾝﾗﾝﾄﾞ"}]
},{}],6:[function(require,module,exports){
"use strict";

var _production = require("./production.es6");

var _production2 = _interopRequireDefault(_production);

var _data = require("./data.json");

var _data2 = _interopRequireDefault(_data);

var _resultView = require("./resultView.es6");

var _resultView2 = _interopRequireDefault(_resultView);

var _Base = require("./Base64.es6");

var _Base2 = _interopRequireDefault(_Base);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

//import * as d3 from 'd3';
var myproduction = new _production2.default(_data2.default);
var resultView = new _resultView2.default();
var orderList = [];
var idolList = {};
var preloadImage = new Array(183);

function finalizeTheater() {
  d3.select(".theater").remove();
  resultView.result(myproduction.getStandings());
}

function initTheater() {
  var theater = d3.select("#main").append("div").classed("theater", true);

  var memo = theater.append("div").append("p");
  memo.append("span").text("上位から順番に選択してください");
  memo.append("br");
  memo.append("span").text("リタイアすると次から表示されません");
  theater.append("div").classed("card-deck", true).classed("stage", true);

  theater.append("div").classed("progress", true).attr("id", "sortProgress").append("div").classed("progress-bar", true).attr("role", "progressbar").style("width", "0%").attr("aria-valuenow", 0).attr("aria-valuemin", 0).attr("aria-valuemax", 100).text("0%");

  var fixOrderModal = theater.append("div").attr("class", "modal fade").attr("id", "FixOrderModal").attr("tabindex", -1).attr("role", "dialog").attr("aria-labelledby", "FixOrderModalLabel").attr("aria-hidden", "true").append("div").classed("modal-dialog", true).attr("role", "document").append("div").classed("modal-content", true);

  var foModalHeader = fixOrderModal.append("div").classed("modal-header", true);
  foModalHeader.append("h5").classed("modal-title", true).attr("id", "FixOrderModalLabel").text("確認");
  foModalHeader.append("button").attr("type", "button").classed("close", true).attr("data-dismiss", "modal").attr("aria-label", "Close").append("span").attr("aria-hidden", "true").text("\xD7");

  fixOrderModal.append("div").classed("modal-body", true).append("p").attr("id", "FixOrderText").text("まだ順位が確定してません");

  var foModalFooter = fixOrderModal.append("div").classed("modal-footer", true);

  foModalFooter.append("button").attr("class", "btn btn-secondary").attr("data-dismiss", "modal").text("キャラソートに戻る");

  foModalFooter.append("button").attr("class", "btn btn-primary").attr("data-dismiss", "modal").text("順位を確定する").on("click", function () {
    finalizeTheater();
  });

  theater.append("div").classed("mt-3", true).classed("row", true).classed("justify-content-md-center", true).append("div").classed("col-md-6", true).classed("col-sm-12", true).append("button").classed("btn", true).classed("btn-primary", true).classed("btn-lg", true).classed("btn-block", true).attr("disabled", "").attr("id", "nextStage").text("次へ").on("click", function () {
    orderList = [];
    myproduction.setdata(idolList);
    updateProgress(myproduction.getScore());
    idolList = myproduction.getdata();
    preload(myproduction.getSleevesOfStageIdolsNo());
    updateFixOrder();
    if (idolList.length == 0) {
      finalizeTheater();
    } else {
      update(idolList);
    }
  });

  var otherButtonRow = theater.append("div").classed("mt-3", true).classed("row", true).classed("justify-content-md-center", true);

  otherButtonRow.append("div").classed("col-md-4", true).classed("col-sm-6", true).append("button").attr("class", "btn btn-secondary btn-block theaterOtherButton").text("選択を解除する").on("click", function () {
    idolList.forEach(function (d) {
      d.model.select = "none";
    });
    orderList = [];
    orderChange(idolList);
  });

  otherButtonRow.append("div").classed("col-md-4", true).classed("col-sm-6", true).append("button").attr("class", "btn btn-success btn-block theaterOtherButton").attr("data-toggle", "modal").attr("data-target", "#FixOrderModal").attr("id", "decision").text("順位を確定する");

  otherButtonRow.append("div").classed("col-md-4", true).classed("col-sm-6", true).append("button").attr("class", "btn btn-warning btn-block theaterOtherButton").text("未選択をリタイアにする").on("click", function () {
    idolList.forEach(function (d) {
      if (d.model.select === "none") {
        d.model.select = "drop";
      }
    });
    orderChange(idolList);
  });
}

function updateFixOrder() {
  var fixOrder = myproduction.getFixOrderCount();
  var text = "まだ順位が確定してません";
  if (fixOrder > 0) text = fixOrder + "\u4F4D\u307E\u3067\u306E\u9806\u4F4D\u3092\u78BA\u5B9A\u3057\u307E\u3059\u3002";
  d3.select("#FixOrderText").text(text);
}

function cardClick(d) {
  if (d.model.select === "none" || d.model.select === "drop") {
    d.model.select = "order";
    orderList.push(d.model.profile.name);
  } else if (d.model.select === "order") {
    var index = orderList.indexOf(d.model.profile.name);
    var selectIdol = orderList.splice(index, 1)[0];
    var insertIndex = index == 0 ? 1 : index - 1;
    orderList.splice(insertIndex, 0, selectIdol);
  }
  orderChange(idolList);
}

function updateOrder(d) {
  if (d.model.select === "none") {
    return "未選択";
  } else if (d.model.select === "order") {
    d.model.order = orderList.indexOf(d.model.profile.name) + 1;
    return d.model.order + "\u4F4D";
  } else if (d.model.select === "drop") {
    return "リタイア";
  }
}

function update(list) {
  var deck = d3.select(".stage").selectAll(".card").data(list);

  deck.exit().remove();

  var card = deck.enter().append("div").classed("card", true).classed("text-center", true).on("click", cardClick).on("mouseover", function () {
    d3.select(this).classed("card-outline-info", true);
  }).on("mouseout", function () {
    d3.select(this).classed("card-outline-info", false);
  });

  card.append("div").classed("card-header", true).attr("id", "order");
  var img_warpper = card.append("div").classed("img-wrapper", true);
  var top = img_warpper.append("img").classed("card-img-top", true);
  var cardblock = card.append("div").classed("card-block", true);
  var name = cardblock.append("p").attr("id", "name");

  top.merge(deck.select('img')).attr("src", '');
  top.merge(deck.select('img')).attr("src", function (d) {
    return "./img/" + d.model.profile.id + ".png";
  });

  name.merge(deck.select('#name')).text(function (d) {
    return d.model.profile.name;
  });

  orderChange(list);
}

function updateProgress(score) {
  var percent = Math.floor(score.value / score.max * 10000) / 100;
  d3.select("#sortProgress .progress-bar").style("width", percent + "%").attr("aria-valuenow", percent).text(percent + "%(" + score.value + "/" + score.max + ")");
}

function preload(list) {
  list.forEach(function (id) {
    if (preloadImage[id - 1] == null) {
      preloadImage[id - 1] = $("<img>").attr("src", "./img/" + id + ".png");
    }
  });
}

function orderChange(list) {
  var deck = d3.select(".stage").selectAll(".card").data(list);
  deck.select('#order').text(updateOrder).classed("order-1", function (d) {
    return d.model.select === "order" && d.model.order === 1;
  }).classed("order-2", function (d) {
    return d.model.select === "order" && d.model.order === 2;
  }).classed("order-3", function (d) {
    return d.model.select === "order" && d.model.order === 3;
  }).classed("order-retire", function (d) {
    return d.model.select === "drop";
  }).classed("order-unselected", function (d) {
    return d.model.select === "none";
  });
  var nextEnable = true;
  idolList.forEach(function (d) {
    if (d.model.select === "none") {
      nextEnable = false;
    }
  });
  if (nextEnable) {
    d3.select("#nextStage").attr("disabled", null);
  } else {
    d3.select("#nextStage").attr("disabled", "");
  }
}

function paramToIdols(param) {
  var buf = _Base2.default.decode(param);
  var ret = myproduction.bufToIdoles(buf);
  return ret;
}

function init() {
  var list = paramToIdols(document.location.search.substring(1));
  if (list.length !== 0) {
    resultView.result(list);
  } else {
    preload(myproduction.getSleevesOfStageIdolsNo());
    idolList = myproduction.getdata();
    initTheater();
    update(idolList);
    preload(myproduction.getSleevesOfStageIdolsNo());
  }
}

init();

},{"./Base64.es6":4,"./data.json":5,"./production.es6":7,"./resultView.es6":8}],7:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _treeModel = require("tree-model");

var _treeModel2 = _interopRequireDefault(_treeModel);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var tree = new _treeModel2.default();

var production = function () {
  function production(list) {
    var _this = this;

    _classCallCheck(this, production);

    this.root = tree.parse(new idol({ id: 0 }));
    this.currentNode = this.root;
    this.waitingRoom = [];
    this.totalIdol = list.length;
    list.forEach(function (data) {
      _this.waitingRoom.push(tree.parse(new idol(data)));
    });
    this.shuffle(this.waitingRoom);
  }

  _createClass(production, [{
    key: "getFixOrderCount",
    value: function getFixOrderCount() {
      var ret = 0;
      var node = this.root;
      while (node.hasChildren()) {
        if (node.children.length != 1) break;
        node = node.children[0];
        ret++;
      }
      return ret;
    }
  }, {
    key: "getScore",
    value: function getScore() {
      var _this2 = this;

      var ret = 0;
      var rootPoint = this.totalIdol - 1;
      this.root.walk(function (node) {
        if (node.model.profile.id == _this2.currentNode.model.profile.id) {
          return false;
        } else {
          ret += rootPoint--;
        }
      });
      for (var i = 0; i < this.currentNode.children.length; i++) {
        ret += _nodeCount(this.currentNode.children[i]);
      }
      for (var _i = 0; _i < this.waitingRoom.length; _i++) {
        ret += _nodeCount(this.waitingRoom[_i]);
      }
      return { max: this.totalIdol * (this.totalIdol - 1) / 2, value: ret };
      function _nodeCount(_node) {
        var point = 0;
        _sub(_node);
        return point;
        function _sub(__node) {
          if (__node.hasChildren()) {
            var _point = 0;
            for (var _i2 = 0; _i2 < __node.children.length; _i2++) {
              _point += _sub(__node.children[_i2]);
            }
            point += _point;
            return _point + 1;
          } else {
            return 1;
          }
        }
      }
    }
  }, {
    key: "getStandings",
    value: function getStandings() {
      var ret = [];
      var node = this.root;
      var order = 1;
      while (node.hasChildren()) {
        if (node.children.length > 1) {
          node.children.forEach(function (d) {
            d.drop();
          });
          break;
        }
        node = node.children[0];
        node.model.order = order++;
        ret.push(node.drop());
      }
      return ret;
    }
  }, {
    key: "bufToIdoles",
    value: function bufToIdoles(buf) {
      var _this3 = this;

      var ret = [];
      var order = 1;
      buf.forEach(function (id) {
        _this3.waitingRoom.forEach(function (node, i) {
          if (Number(node.model.profile.id) == id) {
            node.model.order = order++;
            ret.push(_this3.waitingRoom.splice(i, 1)[0]);
            return;
          }
        });
      });
      return ret;
    }
  }, {
    key: "setdata",
    value: function setdata(list) {
      var _this4 = this;

      var newList = list.filter(function (v) {
        if (v.model.select === "drop") {
          v.all(function () {
            _this4.totalIdol--;
          });
        }
        return v.model.select === "order";
      });
      newList.sort(function (a, b) {
        if (a.model.order < b.model.order) return -1;
        if (a.model.order > b.model.order) return 1;
        return 0;
      });
      var node = this.currentNode;
      for (var i = 0; i < newList.length; i++) {
        newList[i].model.init();
        node.addChild(newList[i]);
        node = newList[i];
      }
    }
  }, {
    key: "getdata",
    value: function getdata() {
      var ret = [];
      if (this.waitingRoom.length == 0) {
        while (this.currentNode.hasChildren()) {
          if (this.currentNode.children.length > 1) break;
          this.currentNode = this.currentNode.children[0];
        }
        if (this.currentNode.hasChildren()) {
          var length = this.currentNode.children.length;
          for (var j = 0; j < length; j++) {
            this.waitingRoom.push(this.currentNode.children[0].drop());
          }
        }
        this.shuffle(this.waitingRoom);
      }
      ret = this.waitingRoom.splice(0, this.getNextLength(this.waitingRoom.length));
      return ret;
    }
  }, {
    key: "getSleevesOfStageIdolsNo",
    value: function getSleevesOfStageIdolsNo() {
      var length = this.getNextLength(this.waitingRoom.length);
      return this.waitingRoom.filter(function (value, index) {
        return index < length;
      }).map(function (node) {
        return Number(node.model.profile.id);
      });
    }
  }, {
    key: "getNextLength",
    value: function getNextLength(length) {
      var ret = void 0;
      switch (length) {
        case 12:
        case 11:
        case 8:
        case 7:
          ret = 4;
          break;
        case 6:
          ret = 3;
          break;
        default:
          ret = 5;
          break;
      }
      return ret;
    }
  }, {
    key: "shuffle",
    value: function shuffle(list) {
      for (var i = list.length - 1; i > 0; i--) {
        var r = Math.floor(Math.random() * (i + 1));
        var tmp = list[i];
        list[i] = list[r];
        list[r] = tmp;
      }
    }
  }]);

  return production;
}();

var idol = function () {
  function idol(profile) {
    _classCallCheck(this, idol);

    this.profile = profile;
    this.init();
  }

  _createClass(idol, [{
    key: "init",
    value: function init() {
      this.select = "none";
      this.order = 0;
    }
  }]);

  return idol;
}();

exports.default = production;

},{"tree-model":1}],8:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _Base = require("./Base64.es6");

var _Base2 = _interopRequireDefault(_Base);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var resultView = function () {
  function resultView() {
    _classCallCheck(this, resultView);
  }

  _createClass(resultView, [{
    key: "result",
    value: function result(list) {
      var type_color = { "キュート": "#FF55AA", "クール": "#5599EE", "パッション": "#FFBB66" };
      var c10 = d3.scaleOrdinal(d3.schemeCategory10);
      var serverURI = "https://odenpa.com/sgsort/";
      var result = d3.select("#main").append("div").classed("result", true);

      result.append("div").append("h2").text("結果");
      result.append("div").append("hr");

      var table = result.append("div").classed("row", true).append("div").classed("col-xl-6", true).classed("offset-xl-3", true).classed("col-lg-8", true).classed("offset-lg-2", true).classed("col-md-10", true).classed("offset-md-1", true).append("table").classed("table", true);

      var thead_tr = table.append("thead").append("tr");

      var head = [{ "class": "table-rank", "context": "順位" }, { "class": "table-name", "context": "名前" }, { "class": "table-image", "context": "" }];

      thead_tr.selectAll("th").data(head).enter().append("th").text(function (d) {
        return d.context;
      });

      var tbody_tr = table.append("tbody").selectAll("tr").data(list).enter().append("tr");

      tbody_tr.selectAll("td").data(head).enter().append("td").attr("class", function (d) {
        return d.class;
      });

      tbody_tr.select(".table-rank").text(function (d) {
        return d.model.order + "位";
      });
      tbody_tr.select(".table-image").filter(function (d) {
        return d.model.order <= 10;
      }).append("img").attr("src", function (d) {
        return "./img/" + d.model.profile.id + ".png";
      }).classed("table-img", true);
      tbody_tr.select(".table-image").filter(function (d) {
        return d.model.order <= 69 && d.model.profile.name == "前川みく";
      }).append("button").attr("id", "SenkyoButton").attr("class", "btn btn-link").attr("data-toggle", "modal").attr("data-target", "#SenkyoModal").append("i").attr("class", "fa fa-comment").attr("aria-hidden", "true");
      tbody_tr.select(".table-name").text(function (d) {
        return d.model.profile.name;
      });

      //SNS
      var buf = [];
      list.forEach(function (d) {
        buf.push(Number(d.model.profile.id));
      });

      var b64 = _Base2.default.encode(buf);
      var b64_30 = _Base2.default.encode(buf.slice(0, 30));

      var text = "【デレステキャラソート結果】";
      for (var i = 0; i < list.length; i++) {
        text += list[i].model.order + "\u4F4D " + list[i].model.profile.name + " ";
        if (text.length > 50) break;
      }
      var uri = "http://twitter.com/share?url=" + serverURI + "?" + b64 + "&text=" + text + "&hashtags=\u30C7\u30EC\u30B9\u30C6\u30AD\u30E3\u30E9\u30BD\u30FC\u30C8";
      var uri_30 = "http://twitter.com/share?url=" + serverURI + "?" + b64_30 + "&text=" + text + "&hashtags=\u30C7\u30EC\u30B9\u30C6\u30AD\u30E3\u30E9\u30BD\u30FC\u30C8";

      var snsblock = result.append("div").classed("row", true).classed("justify-content-md-center", true);
      var tw_30 = snsblock.append("div").classed("col-lg-5", true).classed("col-md-8", true).append("a").attr("href", uri_30).attr("target", "_blank").classed("btn", true).classed("twitter-share-button", true).classed("btn-block", true).on("click", function () {
        d3.event.preventDefault();
        window.open(encodeURI(decodeURI(this.href)), 'TWwindow', 'width=600, height=500, menubar=no, toolbar=no, scrollbars=yes');
        return false;
      });
      tw_30.append("i").attr("class", "fa fa-twitter").attr("aria-hidden", "true");
      tw_30.append("span").text("結果をツイートする(上位30位)");
      var tw = snsblock.append("div").classed("col-lg-5", true).classed("col-md-8", true).append("a").attr("href", uri).attr("target", "_blank").classed("btn", true).classed("twitter-share-button", true).classed("btn-block", true).on("click", function () {
        d3.event.preventDefault();
        window.open(encodeURI(decodeURI(this.href)), 'TWwindow', 'width=600, height=500, menubar=no, toolbar=no, scrollbars=yes');
        return false;
      });
      tw.append("i").attr("class", "fa fa-twitter").attr("aria-hidden", "true");
      tw.append("span").text("結果をツイートする(全て)");

      //リンク

      result.append("div").classed("row", true).classed("justify-content-md-center", true).classed("row", true).append("div").classed("col-lg-6", true).classed("col-md-10", true).classed("mt-3", true).append("a").attr("class", "btn btn-block btn-success btn-lg").attr("href", serverURI).text("最初からキャラソートを始める");

      var sModalContent = result.append("div").attr("class", "modal fade").attr("id", "SenkyoModal").attr("tabindex", "-1").attr("role", "dialog").attr("aria-labelledby", "SenkyoModalLabel").attr("aria-hidden", "true").append("div").classed("modal-dialog", true).attr("role", "document").append("div").classed("modal-content", true);

      var sModalHeader = sModalContent.append("div").classed("modal-header", true);

      sModalHeader.append("h5").attr("id", "SenkyoModalLabel").text("第7回シンデレラガール総選挙応援！");
      sModalHeader.append("button").classed("close", true).attr("data-dismiss", "modal").attr("aria-label", "Close").append("span").attr("aria-hidden", "true").text("\xD7");
      var sModalBody = sModalContent.append("div").classed("modal-body", true);
      sModalBody.append("img").attr("class", "pull-right img-responsive").attr("style", "padding:0;margin:0 0 15px 15px;").attr("src", "./img/miku2.png");
      sModalBody.append("h4").text("ご挨拶");
      sModalBody.append("p").text("キャラソートお疲れさまでした！");
      sModalBody.append("p").text("楽しんでいただけましたでしょうか。");
      sModalBody.append("p").text("突然ですが宣伝とお願いです。キャラソートと比べたらお時間はいただきません。少しだけお付き合いいただけると幸いです。");
      sModalBody.append("p").text("4月10日から「第7回シンデレラガール総選挙」が開催中です。");
      sModalBody.append("p").classed("clearfix", true).text("今回からはデレステでも投票ができるようになりました。これから前川みくの宣伝をします。ほんの少しで構いません、お力を分けていただけないでしょうか。");
      sModalBody.append("h4").text("前川みくのご紹介");
      sModalBody.append("img").attr("class", "pull-left img-responsive").attr("style", "padding:0;margin:0 15px 15px 0;").attr("src", "./img/miku1.png");
      sModalBody.append("p").text("猫耳を付けてにゃあにゃあ言ってる世界一かわいいネコチャンアイドルです。そんな彼女ですが根はとってもマジメ。ネコチャンアイドルをやっているのも、デビューしたての頃に他のアイドルに埋もれて鳴かず飛ばずだった時に一生懸命考えた起死回生の策だったのです。");
      sModalBody.append("p").classed("clearfix", true).text("ネコチャンを手に入れた前川みくはアイドルとして日の目を見ることができました。しかし、そんな成功経験からなのか、ネコチャンが無いとまた埋もれていたころに戻ってしまう、と不安に思っている節があります。");
      sModalBody.append("img").attr("class", "pull-right img-responsive").attr("style", "padding:0;margin:0 0 15px 15px;").attr("src", "./img/miku3.png");
      sModalBody.append("p").text("そんなことはあり得ません！ネコチャンはみく自身が努力で手に入れたものです。みくがアイドルを目指して真面目に、ひたむきに、前のめりで挑戦し、努力し続ける姿が魅力的なのです。それは決して埋もれない類まれなみくの個性です。");
      sModalBody.append("p").text("最近は猫耳を外す出番も増えてきて、少しずつそんな不安も解消しているように見えます。でもまだ完全に払拭できていないと思います。");
      sModalBody.append("p").text("そんな今だからこそ、今まで努力してきたことは間違っていないよ！その魅力はみく自身のものだよ！最高にかわいいよ！と全力で肯定してあげたいのです。");
      sModalBody.append("h4").text("最後に");
      sModalBody.append("p").text("話が長くなってしまい、申し訳ございません。ほんの少しでもお力を分けていただけたら幸いです。");
      sModalBody.append("p").text("改めて、第7回アイドルマスターシンデレラガール総選挙、前川みくをよろしくお願いいたします。");
      sModalBody.append("p").classed("clearfix", true).text("著：@syoudou");
      sModalContent.append("div").classed("modal-footer", true).append("button").attr("type", "button").attr("class", "btn btn-secondary").attr("data-dismiss", "modal").text("閉じる");
      //グラフ表示始め
      result.append("div").classed("mt-3", true).append("h2").text("結果のグラフ").append("hr");

      var ChartSelectGroup = result.append("div").classed("row", true).append("div").classed("btn-group", true).attr("id", "ChartSelect").attr("data-toggle", "buttons");
      var label_all = ChartSelectGroup.append("button").attr("class", "btn chart-select-button btn-outline-info").attr("value", "all");
      label_all.append("span").text("全て");
      var label_30 = ChartSelectGroup.append("button").attr("class", "btn chart-select-button btn-outline-info active").attr("value", "30");
      label_30.append("span").text("TOP30");
      var label_20 = ChartSelectGroup.append("button").attr("class", "btn chart-select-button btn-outline-info").attr("value", "20");
      label_20.append("span").text("TOP20");
      var label_10 = ChartSelectGroup.append("button").attr("class", "btn chart-select-button btn-outline-info").attr("value", "10");
      label_10.append("span").text("TOP10");

      ChartSelectGroup.selectAll("button").on("click", function () {
        d3.select("#ChartSelect").select(".active").classed("active", false);
        var selectedValue = d3.select(this).attr('value');

        var chartLiest = list;

        if (Number(selectedValue)) {
          chartLiest = chartList.slice(0, Number(selectedValue));
        }
        pieDataChange(chartLiest);
        plotDataChange(chartLiest);
        resultUpdate(true);
      });

      //図表
      var chartList = list.slice(0, 30);

      var pie = d3.pie().sort(null).value(function (d) {
        return d.values.length;
      });

      piechart(chartList);

      //身長・年齢チャート
      var plotlist = [].concat(chartList);
      d3.nest().key(function (d) {
        return d.model.profile.age_num;
      }).key(function (d) {
        return d.model.profile.height_num;
      }).entries(plotlist).forEach(function (d) {
        d.values.forEach(function (d) {
          if (d.values.length > 1) {
            for (var _i = 0; _i < d.values.length; _i++) {
              d.values[_i].model["dupl_count"] = d.values.length;
              d.values[_i].model["dupl_index"] = _i;
            }
          }
        });
      });

      var plotDiv = result.append("div").classed("row", true);

      var svgplot = plotDiv.append("div").classed("col-lg-10", true).classed("offset-lg-1", true).append("svg").attr("id", "PlotChart").append("g");

      var x_plot = d3.scaleLinear().domain([d3.min(plotlist, function (d) {
        return d.model.profile.age_num;
      }) - 1, d3.max(plotlist, function (d) {
        return d.model.profile.age_num;
      }) + 1]);

      var y_plot = d3.scaleLinear().domain([d3.min(plotlist, function (d) {
        return d.model.profile.height_num;
      }) - 1, d3.max(plotlist, function (d) {
        return d.model.profile.height_num;
      }) + 1]);
      svgplot.append('g').attr('class', 'x axis');

      svgplot.append('g').attr('class', 'y axis');
      svgplot.append("g").classed("circle_g", true).selectAll("circle").data(plotlist).enter().append("circle");

      var tooltip_g = svgplot.append("g").attr("id", "tooltip").style("opacity", 0);
      var tooltip_rect = tooltip_g.append("rect").attr("rx", 10).attr("ry", 10).attr("width", "120").attr("height", "60");
      var tooltip_text_name = tooltip_g.append("text").attr("dx", ".35em").attr("dy", "1.35em").style("fill", "white");
      var tooltip_text_age = tooltip_g.append("text").attr("dx", ".35em").attr("dy", "2.5em").style("fill", "white");
      var tooltip_text_height = tooltip_g.append("text").attr("dx", ".35em").attr("dy", "3.75em").style("fill", "white");

      resultUpdate();
      var win = d3.select(window);
      win.on("resize", resultUpdate);

      function resultUpdate(flag) {
        pieUpdate(flag);
        plotUpdate(flag);
      }

      function plotUpdate() {
        var svg = d3.select("#PlotChart");
        var size = parseInt(svg.style("width"));
        var margin = {
          left: 45,
          right: 45,
          top: 65,
          bottom: 50
        };
        var width = size - margin.left - margin.right;
        var height = size * 0.75 - margin.top - margin.bottom;

        svg.attr('width', width + margin.left + margin.right).attr('height', height + margin.top + margin.bottom);

        var svgplot = svg.select("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        var xScale = x_plot.range([0, width]);
        var yScale = y_plot.range([height, 0]);

        var xAxis = d3.axisBottom().scale(xScale).tickSize(-height).ticks(Math.ceil(size / 100) > chartList.length ? chartList.length : Math.ceil(size / 100)).tickFormat(function (d) {
          return d + " \u6B73";
        });

        var yAxis = d3.axisLeft().scale(yScale).tickSize(-width).tickFormat(function (d) {
          return d + " cm";
        });

        svgplot.select(".x").attr('transform', 'translate( 0, ' + height + ')').call(xAxis);

        svgplot.select(".y").call(yAxis);

        svgplot.selectAll("circle").attr("r", size / 80).attr("fill", function (d) {
          return type_color[d.model.profile.type];
        }).attr("cx", function (d) {
          if (d.model.dupl_count) {
            var r = d3.select(this).attr("r");
            return xScale(d.model.profile.age_num) - (d.model.dupl_count - 1) * r + d.model.dupl_index * 2 * r;
          }
          return xScale(d.model.profile.age_num);
        }).attr("cy", function (d) {
          return yScale(d.model.profile.height_num);
        }).on("mouseover", function (d) {
          tooltip_g.transition().duration(200).style("opacity", .9);
          tooltip_rect.transition().duration(200).attr("x", d3.select(this).attr("cx") - 60).attr("y", d3.select(this).attr("cy") - 70).attr("fill", type_color[d.model.profile.type]);
          tooltip_text_name.transition().duration(200).attr("x", d3.select(this).attr("cx") - 60).attr("y", d3.select(this).attr("cy") - 70).text(d.model.profile.name);
          tooltip_text_age.transition().duration(200).attr("x", d3.select(this).attr("cx") - 60).attr("y", d3.select(this).attr("cy") - 70).text(d.model.profile.age);
          tooltip_text_height.transition().duration(200).attr("x", d3.select(this).attr("cx") - 60).attr("y", d3.select(this).attr("cy") - 70).text(d.model.profile.height_num + "cm");
        }).on("mouseout", function () {
          tooltip_g.transition().duration(300).style("opacity", 0);
        });
      }

      function piechart(list) {
        var listType = d3.nest().key(function (d) {
          return d.model.profile.type;
        }).entries(list);

        var listBloodtype = d3.nest().key(function (d) {
          return d.model.profile.bloodtype;
        }).entries(list);

        var result = d3.select(".result");

        var row = result.append("div").classed("mt-3", true).classed("row", true).classed("justify-content-md-center", true);

        var svgType = row.append("div").classed("col-lg-6", true).classed("col-md-8", true).append("svg").attr("id", "TypeChart").attr("class", "PieChart");

        var gType = svgType.selectAll(".arc").data(pie(listType)).enter().append("g").attr("class", "arc");

        gType.append("path").attr("stroke", "white").style("fill", function (d) {
          return type_color[d.data.key];
        }).each(function (d) {
          this._current = d;
        });

        gType.append("text").attr("dy", ".35em").style("text-anchor", "middle").style("fill", "white").text(function (d) {
          return d.data.key + " : " + d.data.values.length + "\u4EBA";
        });

        var svgBloodtype = row.append("div").classed("col-lg-6", true).classed("col-md-8", true).append("svg").attr("id", "BloodtypeChart").attr("class", "PieChart");

        var gBloodtype = svgBloodtype.selectAll(".arc").data(pie(listBloodtype)).enter().append("g").attr("class", "arc");

        gBloodtype.append("path").attr("stroke", "white").style("fill", function (d, i) {
          return c10(i);
        }).each(function (d) {
          this._current = d;
        });

        gBloodtype.append("text").attr("dy", ".35em").style("text-anchor", "middle").style("fill", "white").text(function (d) {
          return d.data.key + " : " + d.data.values.length + "\u4EBA";
        });
      }

      function pieUpdate(animation) {
        var svg = d3.selectAll(".PieChart");
        var piesize = parseInt(svg.style("width"));

        var arc = d3.arc().innerRadius(piesize / 10);

        arc.outerRadius(piesize / 2);

        svg.attr("width", piesize).attr("height", piesize);

        var g = svg.selectAll(".arc").attr("transform", "translate(" + piesize / 2 + "," + piesize / 2 + ")");

        g.selectAll("text").attr("font-size", piesize / 25);

        if (animation) {
          g.selectAll("path").transition().duration(1000).attrTween("d", function (d) {
            var interpolate = d3.interpolate(this._current, d);
            this._current = interpolate(0);
            return function (t) {
              return arc(interpolate(t));
            };
          });
        } else {
          g.selectAll("path").attr("d", arc);
        }

        if (animation) {
          g.selectAll("text").transition().duration(1000).attr("transform", function (d) {
            return "translate(" + arc.centroid(d) + ")";
          });
        } else {
          g.selectAll("text").attr("transform", function (d) {
            return "translate(" + arc.centroid(d) + ")";
          });
        }
      }

      function pieDataChange(list) {
        var svgType = d3.select("#TypeChart");
        var listType = d3.nest().key(function (d) {
          return d.model.profile.type;
        }).entries(list);

        var arcType = svgType.selectAll(".arc").data(pie(listType));

        arcType.exit().remove();

        var gType = arcType.enter().append("g").attr("class", "arc");

        gType.append("path").attr("stroke", "white");

        gType.append("text").attr("dy", ".35em").style("text-anchor", "middle").style("fill", "white");

        gType.merge(arcType).select("path").style("fill", function (d) {
          return type_color[d.data.key];
        });
        gType.merge(arcType).select("text").text(function (d) {
          return d.data.key + " : " + d.data.values.length + "\u4EBA";
        });

        var svgBloodtype = d3.select("#BloodtypeChart");
        var listBloodtype = d3.nest().key(function (d) {
          return d.model.profile.bloodtype;
        }).entries(list);
        var arcBloodtype = svgBloodtype.selectAll(".arc").data(pie(listBloodtype));

        arcBloodtype.exit().remove();

        var gBloodtype = arcBloodtype.enter().append("g").attr("class", "arc");

        gBloodtype.append("path").attr("stroke", "white");

        gBloodtype.append("text").attr("dy", ".35em").style("text-anchor", "middle").style("fill", "white");

        gBloodtype.merge(arcBloodtype).select("path").style("fill", function (d, i) {
          return c10(i);
        });
        gBloodtype.merge(arcBloodtype).select("text").text(function (d) {
          return d.data.key + " : " + d.data.values.length + "\u4EBA";
        });
      }

      function plotDataChange(list) {
        var plotlist = [].concat(list);
        d3.nest().key(function (d) {
          return d.model.profile.age_num;
        }).key(function (d) {
          return d.model.profile.height_num;
        }).entries(plotlist).forEach(function (d) {
          d.values.forEach(function (d) {
            if (d.values.length > 1) {
              for (var _i2 = 0; _i2 < d.values.length; _i2++) {
                d.values[_i2].model["dupl_count"] = d.values.length;
                d.values[_i2].model["dupl_index"] = _i2;
              }
            }
          });
        });

        var svgplot = d3.select("#PlotChart").select(".circle_g");

        x_plot = d3.scaleLinear().domain([d3.min(plotlist, function (d) {
          return d.model.profile.age_num;
        }) - 1, d3.max(plotlist, function (d) {
          return d.model.profile.age_num;
        }) + 1]);

        y_plot = d3.scaleLinear().domain([d3.min(plotlist, function (d) {
          return d.model.profile.height_num;
        }) - 1, d3.max(plotlist, function (d) {
          return d.model.profile.height_num;
        }) + 1]);

        var circle = svgplot.selectAll("circle").data(plotlist);

        circle.exit().remove();

        circle.enter().append("circle");
      }
    }
  }]);

  return resultView;
}();

exports.default = resultView;

},{"./Base64.es6":4}]},{},[6]);
