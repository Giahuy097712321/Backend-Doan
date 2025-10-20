const ProductService = require('../services/Productservice')

const createProduct = async (req, res) => {
    try {
        const { name, image, type, countInStock, price, rating, description, discount } = req.body
        if (!name || !image || !type || !countInStock || !price || !rating || !description || !discount) {
            return res.status(200).json({
                status: 'ERR',
                message: 'The input is required'
            });
        }
        const response = await ProductService.createProduct(req.body)
        return res.status(200).json(response)
    } catch (e) {
        return res.status(404).json({
            message: e
        });
    }
}
const updateProduct = async (req, res) => {
    try {
        const productId = req.params.id
        const data = req.body
        if (!productId) {
            return res.status(200).json({
                status: 'ERR',
                message: 'The productId is required'
            })
        }
        const response = await ProductService.updateProduct(productId, data)
        return res.status(200).json(response)
    } catch (e) {
        return res.status(404).json({
            message: e
        })
    }
}
const getDetailsProduct = async (req, res) => {
    try {
        const productId = req.params.id
        if (!productId) {
            return res.status(200).json({
                status: 'ERR',
                message: 'The productId is required'
            });
        }
        const response = await ProductService.getDetailsProduct(productId)
        return res.status(200).json(response)
    } catch (e) {
        return res.status(404).json({
            message: e
        })
    }
}
const deleteProduct = async (req, res) => {
    try {
        const productId = req.params.id

        if (!productId) {
            return res.status(200).json({
                status: 'ERR',
                message: 'The productID is required'
            });
        }

        const result = await ProductService.deleteProduct(productId)
        return res.status(200).json(result)
    } catch (e) {
        return res.status(404).json({
            message: e
        })
    }
}
const deleteManyProduct = async (req, res) => {
    try {
        const { ids } = req.body;  // nhận đúng từ client gửi
        if (!ids || ids.length === 0) {
            return res.status(200).json({
                status: 'ERR',
                message: 'The ids is required',
            });
        }
        const response = await ProductService.deleteMany(ids);
        return res.status(200).json(response);
    } catch (e) {
        return res.status(404).json({ message: e.message });
    }
};


const getAllProduct = async (req, res) => {
    try {
        const { limit, page, sort, filter } = req.query;

        // 👉 Nếu không có limit => truyền null
        const result = await ProductService.getAllProduct(
            limit ? Number(limit) : null,
            page ? Number(page) : null,
            sort,
            filter
        );

        return res.status(200).json(result);
    } catch (e) {
        return res.status(500).json({
            message: e.message,
            stack: e.stack
        });
    }
};
const getAllType = async (req, res) => {
    try {

        const result = await ProductService.getAllType();

        return res.status(200).json(result);
    } catch (e) {
        return res.status(500).json({
            message: e.message,
            stack: e.stack
        });
    }
};
module.exports = {
    createProduct, updateProduct, getDetailsProduct, deleteProduct, getAllProduct, deleteManyProduct,
    getAllType
}