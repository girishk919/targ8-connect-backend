const Category = require('../../models/admin/category_model');
const Leads = require('../../models/admin/leads_model');
const ActivityLog = require('../../models/admin/activity_log_model');

const categoryValidation = require('../../validations/admin/category_validation');

const createCategory = async (req, res) => {
    const { error } = categoryValidation.validate(req.body);
    if(error) return res.status(400).json(error.details[0].message);

    const category = await Category.findOne({ name: req.body.name });
    
    if(category)
        return res.status(400).json('Category ALREADY PRESENT IN DATABASE');
  
    const newCategory = await Category.create(req.body);

    await newCategory.save();

    const addActivityLog = new ActivityLog({
        person: req.user.id,
        role: req.user.role,
        heading: "Category Added",
        message: "Added a new category: " + newCategory.name + ".",
    })

    await addActivityLog.save();

    res.status(200).json({
        status: "SUCCESS",
        data: newCategory,
        message: 'CATEGORY CREATED SUCCESSFULLY',
    });
};
  
const updateCategory = async (req, res) => {
    const { error } = categoryValidation.validate(req.body);
    if(error) return res.status(400).json(error.details[0].message);
    
    Category.findByIdAndUpdate(req.params.id, req.body, {returnDocument:'after'}, (err, category)=>{
        if(err)
            return res.status(400).json('CATEGORY NOT FOUND');
        else{

            const addActivityLog = new ActivityLog({
                person: req.user.id,
                role: req.user.role,
                heading: "Category Updated",
                message: "Updated a category: " + category.name + " status: " + category.status + ".",
            })

            addActivityLog.save()
                .then(() => {
                    res.status(200).json({
                        status: "SUCCESS",
                        data: category,
                        message: 'CATEGORY UPDATED SUCCESSFULLY',
                    });
                })
                .catch(err => res.status(400).json("Error: "+err));
        }
    });
};
  
const getCategoryById = async (req, res) => {
    let category = await Category.findById(req.params.id);

    if(!category)
        return res.status(400).json('CATEGORY NOT FOUND');
    
    res.status(200).json({
        status: "SUCCESS",
        data: category,
        message: 'CATEGORY FETCHED SUCCESSFULLY',
    });
};
  
const getAllCategory = async (req, res) => {
    let category = await Category.find();

    if(!category)
        return res.status(400).json('CATEGORY NOT FOUND');
    
    res.status(200).json({
        status: "SUCCESS",
        data: category,
        message: 'ALL CATEGORY FETCHED SUCCESSFULLY',
    });
};
  
const deleteCategory = async (req, res) => {
    let category = await Category.findById(req.params.id);

    if(!category)
        return res.status(400).json('CATEGORY NOT FOUND');

    const totalCount = await Leads.countDocuments({ category: category._id });

    if(totalCount > 0) return res.status(400).json("Category not empty!");
    
    await category.delete();

    const addActivityLog = new ActivityLog({
        person: req.user.id,
        role: req.user.role,
        heading: "Category Deleted",
        message: "Deleted a category: " + category.name + ".",
    })

    await addActivityLog.save();

    res.status(200).json({
        status: "SUCCESS",
        data: category,
        message: 'CATEGORY DELETED SUCCESSFULLY',
    });
};

module.exports = { createCategory, updateCategory, getCategoryById, getAllCategory, deleteCategory};