const { default: axios } = require('axios');
const ZohoAuth = require('../../models/Zoho/auth_model');

const getRefreshToken = async () => {
	try {
		const refresh_token = (await ZohoAuth.findOne({})).refresh_token;
		let url = `https://accounts.zoho.in/oauth/v2/token?refresh_token=${refresh_token}&client_id=${process.env.ZOHO_CLIENT_ID}&client_secret=${process.env.ZOHO_CLIENT_SECRET}&grant_type=refresh_token`;
		const resp = await axios.post(url);

		const access_token = await ZohoAuth.updateOne(
			{},
			{ $set: { access_token: resp.data.access_token } }
		);
		return resp.data.access_token;
	} catch (err) {
		console.log(err.message);
		// throw new Error('There was some error !');
	}
};

const AddCompanyToCRM = async (data) => {
	try {
		const access_token = (await ZohoAuth.findOne({})).access_token;
		try {
			const resp = await axios.post(
				'https://www.zohoapis.in/crm/v3/Companies',
				{ data: [data] },
				{
					headers: {
						Authorization: `Zoho-oauthtoken ${access_token}`,
						scope: 'ZohoCRM.org.ALL',
					},
				}
			);
		} catch (err) {
			//   console.log(err);
			if (err.response.status === 401) {
				let newAccessToken = await getRefreshToken();
				console.log(newAccessToken);
				const resp = await axios.post(
					'https://www.zohoapis.in/crm/v3/Companies',
					{ data: [data] },
					{
						headers: {
							Authorization: `Zoho-oauthtoken ${newAccessToken}`,
							scope: 'ZohoCRM.org.ALL',
						},
					}
				);
			}
		}
	} catch (err) {
		console.log(err.message);
		//throw new Error(err.message);
	}
};

module.exports = { AddCompanyToCRM };
