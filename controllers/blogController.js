import Blog from '../models/blogModel.js';
import { toPublicUrl } from '../utils/publicUrl.js';

const getBlogs = async (req, res) => {
    const blogs = await Blog.find({}).sort({ createdAt: -1 });
    res.json(
        blogs.map((b) => ({
            ...b.toObject(),
            thumbnail: toPublicUrl(b.thumbnail, req),
        })),
    );
};
const getBlogById = async (req, res) => {
    let blog;
    // Try finding by ID first
    if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
        blog = await Blog.findById(req.params.id);
    }
    
    // If not found by ID or if ID is a slug, try finding by slug
    if (!blog) {
        blog = await Blog.findOne({ slug: req.params.id });
    }

    blog
        ? res.json({
            ...blog.toObject(),
            thumbnail: toPublicUrl(blog.thumbnail, req),
        })
        : res.status(404).json({ message: 'Not found' });
};
const createBlog = async (req, res) => { try { res.status(201).json(await Blog.create(req.body)); } catch (e) { res.status(400).json({ message: e.message }); } };
const updateBlog = async (req, res) => {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: 'Not found' });
    Object.assign(blog, req.body);
    res.json(await blog.save());
};
const deleteBlog = async (req, res) => {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: 'Not found' });
    await blog.deleteOne();
    res.json({ message: 'Removed' });
};
export { getBlogs, getBlogById, createBlog, updateBlog, deleteBlog };
