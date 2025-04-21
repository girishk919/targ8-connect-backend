const router = require('express').Router();
const { verifyToken, accessAdmin } = require('../../helpers/authorize');
const Tabs = require('../../models/sub-admin/Access_Tabs');

router.get('/', [verifyToken, accessAdmin], async (req, res) => {
	try {
		const tabs = await Tabs.find({});
		res.status(200).json(tabs);
	} catch (err) {
		res.status(400).json('There was some error !');
	}
});

router.post('/', [verifyToken, accessAdmin], async (req, res) => {
	try {
		const tab = await Tabs.create({ description: req.body.description });
		res.status(200).json(tab);
	} catch (err) {
		res.status(400).json('There was some error !');
	}
});

router.delete('/', [verifyToken, accessAdmin], async (req, res) => {
	try {
		const deletedTab = await Tabs.findByIdAndDelete(req.query.id);
		res.status(200).json({ message: 'Deleted Successfully !', deletedTab });
	} catch (err) {
		res.status(400).json('There was some error');
	}
});
module.exports = router;
