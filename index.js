const fs = require('fs');
const request = require('request');
const axios = require('axios');
const cheerio = require('cheerio');
var mysql      = require(`mysql-await`);
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
	

	async function downloadImage (url, path, fileName, id) {  
		const writer = fs.createWriteStream(path+'/'+fileName)
	
		const response = await axios({
			url,
			method: 'GET',
			responseType: 'stream'
		})
	
		response.data.pipe(writer)
	
		return new Promise((resolve, reject) => {
			writer.on('finish', async () => {
				await connection.awaitQuery(`UPDATE cat_breeds SET image='${url}' WHERE id='${id}'`);
				resolve();
			})
			writer.on('error', reject)
		})
	}
// const catsURL = 'https://www.catbreedslist.com/cat-breeds-a-z';
const urls = [
	{
		url: 'https://www.catbreedslist.com/cat-breeds-a-z',
		type: 'cat',
		domain: 'https://www.catbreedslist.com'
	}, 
	{
	url: 'https://www.dogbreedslist.info/dog-breeds-a-z',
	type: 'dog',
	domain: 'https://www.dogbreedslist.info'
	}
]

const htmlToData = async (html, type, domain) => {
	console.log('Fetching...')
	const $ = cheerio.load(html);
	// $('div.all-a-z > dl > dd > a').each( async (i, data) => {
		const allPets = $('div.all-a-z > dl > dd > a');
		for(let i = 0; i < allPets.length; i++){
			const data = allPets[i];
		let name = $(data).find('span img').attr('alt');
		let src = $(data).find('span img').attr('src');
		// console.log('Name:::', name);

		if(!name) {
			name = $(data).attr('title');
			if(!src)
				src = '';
		}

		let dataURL = data.attribs.href;
		if(type === 'cat') {
			dataURL = domain + dataURL;
			if(src !== '') {
				src = domain + src;
			}
		}
		const dir = __dirname + '/images/thumbs/'+type;
		if (!fs.existsSync(dir)){
				fs.mkdirSync(dir);
		}
		
		const AlreadyAdded = await connection.awaitQuery("SELECT name from cat_breeds where name='"+name+"' AND type='"+type+"'");
		if(!AlreadyAdded[0]) {
			console.log("Inserted ", name);
			const res = await connection.awaitQuery('INSERT INTO cat_breeds (name, type, url, image) VALUES ("'+name+'", "'+type+'", "'+dataURL+'","'+src+'")');
			if(src) {
				const fileName = src.split('/');
				const image = await downloadImage(src, dir, fileName[fileName.length - 1], res.insertId);
			}
		}
		// 
	}
	// });
	// console.log(data);
}



const main = async () => {
	for(i = 0; i< urls.length; i++) {
		const response = await axios.get(urls[i].url);
		htmlToData(response.data, urls[i].type, urls[i].domain);
	}
}

main()