const axios = require('axios');
const cheerio = require('cheerio');
var mysql      = require('mysql-await');
var SqlString = require('sqlstring');
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'Lights123!',
  database : 'breed_crawler',
  port: 3306,
  insecureAuth : true
});

connection.connect(function(err) {
    if (err) {
      return console.error('error: ' + err.message);
    }
  
    console.log('Connected to the MySQL server.');
});



const url = 'https://www.catbreedslist.com';


const breedInfo = ['name', 'other_names','origin','size','coat','lap_cat','life_span','temperament','weight','colors','kitten_prices', 'breed_type', 
'breed_group', 'litter_size'];
const breadCharacteristics = ['adaptability','affection_level','child_friendly','dog_friendly','energy_level','grooming','health_issues','intelligence',
'shedding','social_needs','stranger_friendly','vocalization', 'apartment_friendly', 'barking_tendencies', 'cat_friendly', 'exercise_needs', 
'playfulness', 'shedding_level', 'watchdog_ability'];

const getCatDetail = async (html) => {

	let data = [];
	const $ = cheerio.load(html);
	$('table.table-01 > tbody > tr').each( async (i, breed) => {
		const info = $(breed).find('td');
    const colName = $(info[0]).text().toLowerCase().split(' ').join('_');
    if(breedInfo.indexOf(colName) > -1) {
      data.push({
        col: colName,
        val: $(info[1]).text()
      })
    }
	});

  $('table.table-02 > tbody > tr').each( async (i, breed) => {
		const info = $(breed).find('td');
    const colName = $(info[0]).text().toLowerCase().split(' ').join('_');
    if(breadCharacteristics.indexOf(colName) > -1) {
      data.push({
        col: colName,
        val: parseInt($(info[1]).text())
      })
    }
	});

  $('table.table-04 > tbody > tr').each( async (i, breed) => {
		const info = $(breed).find('th');
    const heading = $(info[0]).text();
    if(heading !== '') {
      data.push({
        col: heading.toLowerCase().split(' ').join('_').trimRight('/n').trimLeft('/n'),
        val: $(breed).next('tr').text().replace('More +', '').replace('Less -', '').trimRight('/n').trimLeft('/n')
      })
    }
    
	});


  return data;
}



const trimRight = function(charlist) {
  if (charlist === undefined)
    charlist = "\s";

  return this.replace(new RegExp("[" + charlist + "]+$"), "");
};

const trimLeft = function(charlist) {
  if (charlist === undefined)
    charlist = "\s";

  return this.replace(new RegExp("^[" + charlist + "]+"), "");
};
const main = async () => {
const allCats = await connection.awaitQuery("SELECT * FROM cat_breeds");
let dbColors = [];//await connection.awaitQuery("Select * from colors");
let dbCoats = [];//await connection.awaitQuery("Select * from coats");
let dbTemp = [];//await connection.awaitQuery("Select * from temperaments");
let allColors = [];
let catAttributes = [];
// console.log(allCats);
// catAttributes = await allCats.map(async ac => {
  for(i=0; i<allCats.length; i++){
    ac = allCats[i];
    console.log("TYPE::::", ac.type);
  let catObject = {};
    const response = await axios.get(ac.url)
    
    if(response.data) {
    // console.log(response.data);
    const data = await getCatDetail(response.data);
    //  console.log(data);
    const name = data.filter(d => d.col === 'name'); 
    const catName = name[0] ? name[0].val : '';
    // console.log('Data Fetched:::', catName, name, ac.name);

    if(catName !== '') {
      const cat = await connection.awaitQuery("SELECT * FROM cat_breeds where name='"+catName+"'");
      if(cat[0]) {
        const otherNames = data.filter(d => d.col === 'other_names');
        const catOtherNames = otherNames[0] ? otherNames[0].val : '';

        const coats = data.filter(d => d.col === 'coat');
        const temperaments = data.filter(d => d.col === 'temperament');
        const colors = data.filter(d => d.col === 'colors');
        const catCoats = coats[0] ? coats[0].val.trimLeft('/n').trimRight('/n').split('\n') : [];
        const catTemp = temperaments[0] ? temperaments[0].val.trimLeft('/n').trimRight('/n').split('\n') : [];
        const catColors = colors[0] ? colors[0].val.trimLeft('/n').trimRight('/n').split('\n') : [];
        // console.log('colors::', catColors);
        const origions = data.filter(d => d.col === 'origin');
        const catOrigins = origions[0] ? origions[0].val.trimRight('/n').trimLeft('/n').split('\n').join(',') : '';
      
        const size = data.filter(d => d.col === 'size');
        const catSize = size[0] ? size[0].val : '';
      
        const lap = data.filter(d => d.col === 'lap_cat');
        const catLap = lap[0] ? lap[0].val : null;
      
        const lifeSpan = data.filter(d => d.col === 'life_span');
        const catLifeSpan = lifeSpan[0] ? lifeSpan[0].val : '';
      
        const weight = data.filter(d => d.col === 'weight');
        const catWeight = weight[0] ? weight[0].val.trimRight('/n').trimLeft('/n').split('\n').join(',') : '';


        const breadType = data.filter(d => d.col === 'breed_type');
        const catBreadType = breadType[0] ? breadType[0].val.trimRight('/n').trimLeft('/n').split('\n').join(',') : '';

        const breedGroup = data.filter(d => d.col === 'breed_group');
        const catBreedGroup = breedGroup[0] ? breedGroup[0].val.trimRight('/n').trimLeft('/n').split('\n').join(',') : '';

        const litterSize = data.filter(d => d.col === 'litter_size');
        const catLitterSize = litterSize[0] ? litterSize[0].val.trimRight('/n').trimLeft('/n').split('\n').join(',') : '';








      
        const price = data.filter(d => d.col === 'kitten_prices');
        let catPrice = price[0] ? price[0].val.trimRight('/n').trimLeft('/n').split('\n') : '';
        catPrice = catPrice[0] && catPrice[0].indexOf('$') ? catPrice[0]: '';

        let ratings = [];
        breadCharacteristics.forEach(bc => {
          const query = data.filter(d => d.col === bc);

          if(query[0]) {
            ratings.push(bc+"="+query[0].val);
          }
          // return `${bc.col}=${bc.val}`
        });
        ratings = ratings.join(',');
        const overview = data.filter(d => d.col === 'overview');
        const catOverview = overview[0] ? overview[0].val : '';

        const behaviour = data.filter(d => d.col === 'children_&_other_pets');
        const catBehaviour = behaviour[0] ? behaviour[0].val : '';


        await connection.awaitQuery(`UPDATE cat_breeds SET other_names=${SqlString.escape(catOtherNames)}, origin=${SqlString.escape(catOrigins)}, 
        size=${SqlString.escape(catSize)}, lap_cat=${SqlString.escape(catLap)}, life_span=${SqlString.escape(catLifeSpan)}, 
        weight=${SqlString.escape(catWeight)}, kitten_prices=${SqlString.escape(catPrice)}, breed_type=${SqlString.escape(catBreadType)},
        breed_group=${SqlString.escape(catBreedGroup)}, litter_size=${SqlString.escape(catLitterSize)}, overview=${SqlString.escape(catOverview)}, 
        behaviour=${SqlString.escape(catBehaviour)} ${ratings ? ', '+ratings : ''} WHERE id='${cat[0].id}'`);

        catObject = {
          id: cat[0].id,
          colors: catColors.filter(c => c.length < 15 && c !== '...' && c !== 'All patterns & Colors' ),
          coats: catCoats,
          temperaments: catTemp
        }

        catAttributes.push(catObject);
        
      }
      
    }
    
  }
  // return catObject;


};
// console.log('Attributes::::', catAttributes);
for(let ca=0;ca < catAttributes.length; ca++){
  const catId = catAttributes[ca].id;
  const colors = catAttributes[ca].colors;
  const coats = catAttributes[ca].coats;
  const temperaments = catAttributes[ca].temperaments;
  
  if(colors.length > 0) { //Add colors
    for(let cl=0; cl < colors.length; cl++) {
      const colorName = colors[cl].trim();
      const isColor = await connection.awaitQuery("SELECT * FROM colors where name='"+colorName+"'");
      let colorId = null;
      if(isColor.length > 0) {
        colorId = isColor[0].id;
      } else {
        const newColor = await connection.awaitQuery(`INSERT INTO colors (name) VALUES(${SqlString.escape(colorName)})`);
        colorId = newColor.insertId;
      }
      if(colorId){
        const alreadyAdded = await connection.awaitQuery(`SELECT id from cat_colors where cat_breed_id='${catId}' AND color_id='${colorId}'`)
        if(alreadyAdded.length === 0) {
          await connection.awaitQuery(`INSERT INTO cat_colors (cat_breed_id, color_id) VALUES(${catId}, ${colorId})`);
        }
      }
    }

    if(coats.length > 0) { //Add coats
      for(let cl=0; cl < coats.length; cl++) {
        const coatName = coats[cl].trim();
        const isCoat = await connection.awaitQuery("SELECT * FROM coats where name='"+coatName+"'");
        let coatId = null;
        if(isCoat.length > 0) {
          coatId = isCoat[0].id;
        } else {
          const newColor = await connection.awaitQuery(`INSERT INTO coats (name) VALUES(${SqlString.escape(coatName)})`);
          coatId = newColor.insertId;
        }
        if(coatId){
          const alreadyAdded = await connection.awaitQuery(`SELECT id from cat_coats where cat_breed_id='${catId}' AND coat_id='${coatId}'`)
          if(alreadyAdded.length === 0) {
            await connection.awaitQuery(`INSERT INTO cat_coats (cat_breed_id, coat_id) VALUES(${catId}, ${coatId})`);
          }
        }
      }
    }

      if(temperaments.length > 0) { //Add temperaments
        for(let t=0; t < temperaments.length; t++) {
          const colorName = temperaments[t].trim();
          const isTemp = await connection.awaitQuery("SELECT * FROM temperaments where name='"+colorName+"'");
          let temperamentId = null;
          if(isTemp.length > 0) {
            temperamentId = isTemp[0].id;
          } else {
            const newColor = await connection.awaitQuery(`INSERT INTO temperaments (name) VALUES(${SqlString.escape(colorName)})`);
            temperamentId = newColor.insertId;
          }
          if(temperamentId){
            const alreadyAdded = await connection.awaitQuery(`SELECT id from cat_temperaments where cat_breed_id='${catId}' AND temperament_id='${temperamentId}'`)
            if(alreadyAdded.length === 0) {
              await connection.awaitQuery(`INSERT INTO cat_temperaments (cat_breed_id, temperament_id) VALUES(${catId}, ${temperamentId})`);
            }
          }
        }
      }
  }
};

console.log("Done")

}

main();

