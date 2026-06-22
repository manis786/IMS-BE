import { Category } from '../models/categories.model.js';
import { sendResponse } from '../libs/responseHandler.js';

export const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    sendResponse(res, 200, true, 'Categories fetched', categories);
  } catch (error) {
    sendResponse(res, 500, false, error.message);
  }
};

export const createCategory = async (req, res) => {
  try {
    const newCategory = await Category.create(req.body);
    sendResponse(res, 201, true, 'Category created', newCategory);
  } catch (error) {
    sendResponse(res, 400, false, error.message);
  }
};
export const deleteCategory = async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    sendResponse(res, 200, true, 'Category deleted');
  } catch (error) {
    sendResponse(res, 500, false, error.message);
  }
};