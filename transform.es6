
import fs from "fs";
import csv from "csv";
const input = './data.csv';
const output = './src/data.json';
const parser = csv.parse({columns : true});
const filestream = fs.createReadStream(input, {encoding: "utf-8"});
filestream.pipe(parser);

const outputdata = [];
parser.on("readable", () => {
  let data;
  while ((data = parser.read())) {
    outputdata.push(data);
  }
});

parser.on("end", () => {
  outputdata.forEach((d) => {
    for (const key in d) {
      if(key.endsWith("_num")) d[key] = Number(d[key]);
    }
  });
  fs.writeFileSync(output, JSON.stringify(outputdata));
});