const mongoose = require('mongoose');
const requireLogin = require('../middlewares/requireLogin');
const util = require('util');

const Blog = mongoose.model('Blog');

module.exports = (app) => {
  app.get('/api/blogs/:id', requireLogin, async (req, res) => {
    const blog = await Blog.findOne({
      _user: req.user.id,
      _id: req.params.id,
    });

    res.send(blog);
  });

  app.get('/api/blogs', requireLogin, async (req, res) => {
    try {
      const cacheString = `blogs_${req.user.id}`;
      const redisClient = req.app.get('redisClient');
      redisClient.get = util.promisify(redisClient.get);
      const data_from_cache = await redisClient.get(cacheString);

      console.log(cacheString);

      const blogs = await Blog.find({ _user: req.user.id });

      res.send(blogs);
    } catch (error) {}
  });

  app.post('/api/blogs', requireLogin, async (req, res) => {
    const { title, content } = req.body;

    const blog = new Blog({
      title,
      content,
      _user: req.user.id,
    });

    try {
      await blog.save();
      res.send(blog);
    } catch (err) {
      res.send(400, err);
    }
  });
};
