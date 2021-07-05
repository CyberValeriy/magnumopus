const { validationResult } = require("express-validator/check");
const Post = require("../models/post");
const User = require("../models/user");
const fs = require("fs");
const path = require("path");
const io = require("../socket");

exports.getPosts = async (req, res, next) => {
  const currentPage = req.query.page || 1;
  const postsPerPage = 2;
  let posts;
  let totalPosts;
  try {
    totalPosts = await Post.find().countDocuments();
    posts = await Post.find()
      .populate("creator")
      .skip((currentPage - 1) * postsPerPage)
      .limit(postsPerPage);
  } catch (err) {
    res.json({ message: "Post fetching error" }).status(500);
  }

  res.status(200).json({
    message: "Fetched post successfully!",
    posts: posts,
    totalItems: totalPosts,
  });
};

exports.createPost = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(422)
      .json({ message: "Validation failed", errors: errors.array() });
  }
  if (!req.file) {
    return res.status(422).json({ message: "Image dont't exist!" });
  }
  const imageUrl = req.file.path.replace("\\", "/");
  const title = req.body.title;
  const content = req.body.content;

  let result;
  try {
    result = await new Post({
      title: title,
      content: content,
      imageUrl: imageUrl,
      creator: req.userId,
    });
    await result.save();
  } catch (err) {
    console.log(err);
    res.status(500);
  }
  let user;
  try {
    user = await User.findById(req.userId);
  } catch (err) {
    return res.status(500).json({ message: err });
  }
  user.posts.push(result);
  await user.save();
  console.log({...result});
  await io.getIO().emit("posts", {
    action: "create",
    post: {
      ...result._doc,
      creator: {
        _id: req.userId,
        name: user.name,
      },
    },
  });
  res.status(201).json({
    message: "Post created successfully!",
    post: result,
    creator: { _id: user._id, name: user.name },
  });
};

exports.getPost = async (req, res, next) => {
  const postId = req.params.postId;
  const post = await Post.findById(postId);
  if (!post) {
    res.json({ message: "Post don't exist!" }).status(404);
  }
  res.json({ message: "Post fetched!", post: post });
};

exports.updatePost = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(422)
      .json({ message: "Validation failed", errors: errors.array() });
  }
  const postId = req.params.postId;
  const title = req.body.title;
  const content = req.body.content;
  let imageUrl = req.body.image.replace("\\", "/");
  if (req.file) {
    imageUrl = req.file.path.replace("\\", "/");
  }
  if (!imageUrl) {
    return res.json({ message: "No file picked!" }).status(422);
  }
  let post;
  try {
    post = await Post.findById(postId).populate('creator');
  } catch (err) {
    return res.status(422).json({ message: err });
  }
  if (!post) {
    return res.status(422).json({ message: "Invalid post id" });
  }
  if (req.userId !== post.creator._id.toString()) {
    return res.status(403).json({ message: new Error("Not authorized!") });
  }
  if (imageUrl !== post.imageUrl) {
    clearImage(post.imageUrl);
  }

  post.title = title;
  post.content = content;
  post.imageUrl = imageUrl;
  let result;
  try {
    result = await post.save();
  } catch (err) {
    return res.json({ message: err }).status(500);
  }
  io.getIO().emit('posts',{action:'update',post:result})
  res.status("200").json({ message: "Post updated!", post: result });
};

exports.deletePost = async (req, res) => {
  const postId = req.params.postId;
  let post;
  try {
    post = await Post.findById(postId);
    if (!post) {
      return res.json({ message: "Post not found!" }).status(404);
    }
  } catch (err) {
    return res.json({ message: "Server error!" }).status(500);
  }
  if (post.creator.toString() !== req.userId) {
    return res.status(403).json({ message: "Not authorized!" });
  }
  clearImage(post.imageUrl);
  try {
    await Post.findByIdAndDelete(postId);
  } catch (err) {
    return res.json({ message: err }).status(404);
  }
  let postCreator;
  try {
    postCreator = await User.findById(req.userId);
  } catch (err) {
    return res.status(500).json({ message: err });
  }
  postCreator.posts.pull(post._id);
  try {
    await postCreator.save();
  } catch (err) {
    return res.status(500).json({ message: err });
  }
  io.getIO().emit('posts',{action:'delete',post:postId})
  res.status(200).json({ message: "Post deleted!" });
};

const clearImage = (filePath) => {
  filePath = path.join(__dirname, "..", filePath);
  fs.unlink(filePath, (err) => {});
};
