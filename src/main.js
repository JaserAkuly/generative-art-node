const fs = require("fs").promises;
const { createCanvas, loadImage } = require("canvas");
const console = require("console");
const { layersOrder, format, rarity } = require("./config.js");

const canvas = createCanvas(format.width, format.height);
const ctx = canvas.getContext("2d");

if (!process.env.PWD) {
  process.env.PWD = process.cwd();
}

const buildDir = `${process.env.PWD}/build`;
const metDataFile = '_metadata.json';
const layersDir = `${process.env.PWD}/layers`;

let metadata = [];
let attributes = [];
let hash = [];
let decodedHash = [];

const addRarity = _str => {
  let itemRarity;

  rarity.forEach((r) => {
    if (_str.includes(r.key)) {
      itemRarity = r.val;
    }
  });

  return itemRarity;
};

const cleanName = _str => {
  let name = _str.slice(0, -4);
  rarity.forEach((r) => {
    name = name.replace(r.key, "");
  });
  return name;
};

const getElements = async(path) => {
  const result = await fs.readdir(path);
  return result.filter((item) => !/(^|\/)\.[^\/\.]/g.test(item)).map((i, index) => {
		return {
		id: index + 1,
		name: cleanName(i),
		fileName: i,
		rarity: addRarity(i),
		};
	});
};

const layersSetup = async(layersOrder) => {
  const layers = layersOrder.map(async(layer, index) => {
	const elements = await getElements(`${layersDir}/${layer}/`);
	return {
		id: index,
		name: layer,
		location: `${layersDir}/${layer}/`,
		elements,
		position: { x: 0, y: 0 },
		size: { width: format.width, height: format.height },
	}
  });
  return layers;
};

const buildSetup = async() => {
  try {
	await fs.rmdir(buildDir, { recursive: true });
  } catch (err) {
	console.log(`. ${buildDir} doesn't exist, can't delete it`);
  }
  await fs.mkdir(buildDir);
};

const saveLayer = async(_canvas, _edition) => {
  await fs.writeFile(`${buildDir}/${_edition}.png`, _canvas.toBuffer("image/png"));
};

const addMetadata = _edition => {
  let dateTime = Date.now();
  let tempMetadata = {
    hash: hash.join(""),
    decodedHash: decodedHash,
    edition: _edition,
    date: dateTime,
    attributes: attributes,
  };
  metadata.push(tempMetadata);
  attributes = [];
  hash = [];
  decodedHash = [];
};

const addAttributes = (_element, _layer) => {
  let tempAttr = {
    id: _element.id,
    layer: _layer.name,
    name: _element.name,
    rarity: _element.rarity,
  };
  attributes.push(tempAttr);
  hash.push(_layer.id);
  hash.push(_element.id);
  decodedHash.push({ [_layer.id]: _element.id });
};

const drawLayer = async (_layer, _edition) => {
  let element =
    _layer.elements[Math.floor(Math.random() * _layer.elements.length)];
  addAttributes(element, _layer);
  const image = await loadImage(`${_layer.location}${element.fileName}`);

  ctx.drawImage(
    image,
    _layer.position.x,
    _layer.position.y,
    _layer.size.width,
    _layer.size.height
  );
  await saveLayer(canvas, _edition);
};

const createFiles = async(edition) => {
  const layers = await layersSetup(layersOrder);

  for (let i = 1; i <= edition; i++) {
    for (const layer of layers) {
		await drawLayer(layer, i);
	}
    addMetadata(i);
    console.log("Creating edition " + i);
  }
};

const createMetaData = async() => {
  await fs.stat(`${buildDir}/${metDataFile}`);
  fs.writeFile(`${buildDir}/${metDataFile}`, JSON.stringify(metadata));
};

module.exports = { buildSetup, createFiles, createMetaData };