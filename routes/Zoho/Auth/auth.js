const axios = require('axios');
const ZohoAuth = require('../../../models/Zoho/auth_model');
const router = require('express').Router();

// Old Id 1000.M3S1Z20OQ551SYGE64UGMCQEEPSUTI
// Old Secret 5b3e3bd98eeb380db7df0f8bb3a3256ced9303c475

router.get('/', async (req, res) => {
	try {
		res.redirect(
			`https://accounts.zoho.in/oauth/v2/auth?access_type=offline&response_type=code&client_id=${process.env.ZOHO_CLIENT_ID}&scope=ZohoCRM.modules.ALL&redirect_uri=${process.env.ZOHO_REDIRECT_URL}`
		);
	} catch (err) {
		res.status(400).json('There was some error !');
	}
});

router.get('/callback', async (req, res) => {
	console.log(req.query);
	try {
		let grant_token = req.query.code;
		//let domain = req.query.location;
		//let accounts_URL = req.query['accounts-server'];

		// res.status(200).json(grant_token);
		const data = {
			grant_type: 'authorization_code',
			client_id: '1000.FBWOP2BRNG7N2VLNLJVNM9QXWZBSWC',
			client_secret: 'cdd6a493fbc4e8dfa08fa5f3380cd3f76575be83c6',
			redirect_url: 'http://localhost:5050/zoho/auth/callback',
			code: grant_token,
		};

		console.log(data);

		const url = `https://accounts.zoho.in/oauth/v2/token?grant_type=${data.grant_type}&client_id=${data.client_id}&client_secret=${data.client_secret}&redirect_uri=${data.redirect_url}&code=${data.code}`;
		console.log(url);

		const response = await axios.post(url);

		access_token = response.data.access_token;
		refresh_token = response.data.refresh_token;

		//const auth = ZohoAuth.create({ access_token, refresh_token });

		//"access_token":"1000.b65dacf266cfdeae678e88981a3292d5.9f8fd22b129457e814e05406aa6f8f6b","refresh_token":"1000.d6c94ad8ef9376f234a6622307763903.780544cb9758d1b51f4b2506bc6cef10"
		res.status(200).json(response.data);
	} catch (err) {
		console.log(err);
		res.status(400).json('There was some error !');
	}
});

router.post('/Companies', async (req, res) => {
	try {
		const data = req.body;

		//const refresh_token = await ZohoAuth.find();
		let url = `https://accounts.zoho.in/oauth/v2/token?refresh_token=${process.env.ZOHO_REFRESH_TOKEN}&client_id=${process.env.ZOHO_CLIENT_ID}&client_secret=${process.env.ZOHO_CLIENT_SECRET}&grant_type=refresh_token`;
		const resp = await axios.post(url);
		console.log(resp.data);
		// await axios.post(
		// 	'https://www.zohoapis.in/crm/v3/Leads',
		// 	{
		// 		data: [
		// 			{
		// 				Company: 'Zylker',
		// 				Last_Name: 'Daly',
		// 				First_Name: 'Paul',
		// 				Email: 'p.daly@zylker.com',
		// 			},
		// 		],
		// 	},
		// 	{
		// 		headers: {
		// 			Authorization: `Zoho-oauthtoken ${resp.data.access_token}`,
		// 			scope: 'ZohoCRM.modules.ALL',
		// 		},
		// 	}
		// );

		res.status(200).json({ cae: resp.data });
	} catch (err) {
		console.log(err);
		res.status(400).json('There was an error !');
	}
});

module.exports = router;
