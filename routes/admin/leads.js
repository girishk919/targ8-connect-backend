/** @format */

const express = require('express');
const multer = require('multer');

const router = express.Router();

const authorize = require('../../helpers/authorize');

// const fileStorage = multer.diskStorage({
// 	destination: 'uploads',
// 	filename: (req, file, cb) => {
// 		cb(
// 			null,
// 			file.fieldname + '_' + Date.now() + path.extname(file.originalname)
// 		);
// 		// file.fieldname is name of the field (image)
// 		// path.extname get the uploaded file extension
// 	},
// });

const upload = multer({ storage: multer.memoryStorage() });

const {
	UploadLeadsCSV,
	updateData,
	getFewRecords,
	filterGender,
	leadsFromCategory,
	removeDuplicateLeads,
	getFilterLeadsData,
	populateCity,
	populateFirmType,
	populateHospitalType,
	populateLicenseState,
	populateOwnership,
	populateSpeciality,
	populateSpecialityGroup,
	populateSpecialityType,
	populateState,
	populateTitle,
	populateZipCode,
	populateLocation,
	populateSpty,
	capitalCase,
	bedRange,
	bedRange2,
	updateSingleData,
	leadData,
} = require('../../controllers/admin/leadsController');

// upload csv file to db @Route /api/leads/uploadCustomerCSV
router.post(
	'/uploadCustomerCSV',
	[authorize.verifyToken, authorize.accessAdmin],
	upload.single('file'),
	UploadLeadsCSV
);

router.post(
	'/updateData',
	[authorize.verifyToken, authorize.accessAdmin],
	updateData
);

router.post(
	'/updateSingleData',
	[authorize.verifyToken, authorize.accessAdmin],
	upload.single('file'),
	updateSingleData
);

router.post(
	'/getFewData',
	[authorize.verifyToken, authorize.accessAdmin],
	getFewRecords
);

// fetch data to db @Route /api/leads/filterGender/:query
// router.get(
// 	'/filterGender',
// 	[authorize.verifyToken, authorize.accessAdmin],
// 	filterGender
// );

// router.get(
// 	'/removeDup',
// 	[authorize.verifyToken, authorize.accessAdmin],
// 	removeDuplicateLeads
// );

// router.get(
// 	'/bedrange',
// 	[authorize.verifyToken, authorize.accessAdmin],
// 	bedRange
// );
// router.get(
// 	'/bedrange2',
// 	[authorize.verifyToken, authorize.accessAdmin],
// 	bedRange2
// );

// router.get(
// 	'/capitalCase',
// 	[authorize.verifyToken, authorize.accessAdmin],
// 	capitalCase
// );

// router.get(
// 	'/leadsFromCategory',
// 	[authorize.verifyToken, authorize.accessAdmin],
// 	leadsFromCategory
// );
// router.get(
// 	'/leadsFilterData',
// 	[authorize.verifyToken, authorize.accessAdmin],
// 	getFilterLeadsData
// );
// router.post('/popLocation',[authorize.verifyToken, authorize.accessAdmin], upload.single('file'), populateLocation);
// router.post('/popSpty',[authorize.verifyToken, authorize.accessAdmin], upload.single('file'), populateSpty);
// router.get('/popState',[authorize.verifyToken, authorize.accessAdmin], populateState);
// router.get('/popCity',[authorize.verifyToken, authorize.accessAdmin], populateCity);
// router.get('/popSpty',[authorize.verifyToken, authorize.accessAdmin], populateSpeciality);
// router.get('/popSptyType', populateSpecialityType);
// router.get('/popSptyGroup', populateSpecialityGroup);
// router.get('/popHos', populateHospitalType);
// router.get('/popFirm', populateFirmType);
// router.get('/popOwnership', populateOwnership);
// router.get('/popLic', populateLicenseState);
// router.post('/popTitle', upload.single('file'), populateTitle);
// router.get('/popZipcode', populateZipCode);
router.get(
	'/leadData',
	[authorize.verifyToken, authorize.accessAdmin],
	leadData
);

module.exports = router;
