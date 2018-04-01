import TreeModel from "tree-model";

const tree = new TreeModel();

class production {
  constructor(list) {
    this.root = tree.parse(new idol({ id: 0 }));
    this.currentNode = this.root;
    this.waitingRoom = [];
    this.totalIdol = list.length;
    list.forEach((data) => {
      this.waitingRoom.push(tree.parse(new idol(data)));
    });
    this.shuffle(this.waitingRoom);
  }

  getFixOrderCount() {
    let ret = 0;
    let node = this.root;
    while (node.hasChildren()) {
      if (node.children.length != 1) break;
      node = node.children[0];
      ret++;
    }
    return ret;
  }

  getScore() {
    let ret = 0;
    let rootPoint = this.totalIdol - 1;
    this.root.walk((node) => {
      if(node.model.profile.id == this.currentNode.model.profile.id) {
        return false;
      } else {
        ret += rootPoint--;
      }
    });
    for (let i = 0; i < this.currentNode.children.length; i++) {
      ret += _nodeCount(this.currentNode.children[i]);
    }
    for(let i = 0; i < this.waitingRoom.length; i++) {
      ret += _nodeCount(this.waitingRoom[i]);
    }
    return {max: this.totalIdol * (this.totalIdol - 1) / 2, value: ret};
    function _nodeCount(_node) {
      let point = 0;
      _sub(_node);
      return point;
      function _sub(__node) {
        if (__node.hasChildren()) {
          let _point = 0;
          for (let i = 0; i < __node.children.length; i++) {
            _point += _sub(__node.children[i]);
          }
          point += _point;
          return _point + 1;
        } else {
          return 1;
        }
      }
    }
  }

  getStandings() {
    const ret = [];
    let node = this.root;
    let order = 1;
    while (node.hasChildren()) {
      if (node.children.length > 1) {
        node.children.forEach((d) => {
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

  bufToIdoles(buf) {
    let ret = [];
    let order = 1;
    buf.forEach((id) => {
      this.waitingRoom.forEach((node, i) => {
        if (Number(node.model.profile.id) == id) {
          node.model.order = order++;
          ret.push(this.waitingRoom.splice(i, 1)[0]);
          return;
        }
      });
    });
    return ret;
  }

  setdata(list) {
    const newList = list.filter((v) => {
      if (v.model.select === "drop") {
        v.all(() => {
          this.totalIdol--;
        });
      }
      return (v.model.select === "order");
    });
    newList.sort((a, b) => {
      if (a.model.order < b.model.order) return -1;
      if (a.model.order > b.model.order) return 1;
      return 0;
    });
    let node = this.currentNode;
    for (let i = 0; i < newList.length; i++) {
      newList[i].model.init();
      node.addChild(newList[i]);
      node = newList[i];
    }
  }

  getdata() {
    let ret = [];
    if (this.waitingRoom.length == 0) {
      while (this.currentNode.hasChildren()) {
        if (this.currentNode.children.length > 1) break;
        this.currentNode = this.currentNode.children[0];
      }
      if (this.currentNode.hasChildren()) {
        let length = this.currentNode.children.length;
        for (let j = 0; j < length; j++) {
          this.waitingRoom.push(this.currentNode.children[0].drop());
        }
      }
      this.shuffle(this.waitingRoom);
    }
    ret = this.waitingRoom.splice(0, this.getNextLength(this.waitingRoom.length));
    return ret;
  }

  getSleevesOfStageIdolsNo() {
    const length = this.getNextLength(this.waitingRoom.length);
    return this.waitingRoom.filter((value, index) => index < length).map((node) => Number(node.model.profile.id));
  }

  getNextLength(length) {
    let ret;
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

  shuffle(list) {
    for (let i = list.length - 1; i > 0; i--) {
      const r = Math.floor(Math.random() * (i + 1));
      const tmp = list[i];
      list[i] = list[r];
      list[r] = tmp;
    }
  }
}

class idol {
  constructor(profile) {
    this.profile = profile;
    this.init();
  }

  init() {
    this.select = "none";
    this.order = 0;
  }
}

export default production;