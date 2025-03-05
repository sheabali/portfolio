require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection URL
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function run() {
  try {
    // Connect to MongoDB
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('portfolio');
    const collection = db.collection('users');
    const projects = db.collection('projects');
    const blog = db.collection('blogs'); // Move this up
    const contact = db.collection('contact');

    // User Registration
    app.post('/api/v1/register', async (req, res) => {
      const { username, email, password } = req.body;

      // Check if email already exists
      const existingUser = await collection.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User already exist!!!',
        });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user into the database
      await collection.insertOne({
        username,
        email,
        password: hashedPassword,
        role: 'user',
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully!',
      });
    });

    // User Login
    app.post('/api/v1/login', async (req, res) => {
      const { email, password } = req.body;

      // Find user by email
      const user = await collection.findOne({ email });
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // Compare hashed password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { email: user.email, role: user.role },
        process.env.JWT_SECRET,
        {
          expiresIn: process.env.EXPIRES_IN,
        }
      );

      res.json({
        success: true,
        message: 'User successfully logged in!',
        accessToken: token,
      });
    });

    app.post('/api/v1/create-project', async (req, res) => {
      try {
        const data = req.body; // No need for 'await' here

        // Add timestamp to the data object
        data.timestamp = new Date();

        const project = await projects.insertOne(data);

        res.status(201).json({
          message: 'Project created successfully!',
          projectId: project.insertedId,
          timestamp: data.timestamp, // Optional: return timestamp in response
        });
      } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ message: 'Internal Server Error' });
      }
    });

    // Home Colleages
    app.get('/api/v1/projects', async (req, res) => {
      const result = await projects.find().toArray();
      res.send(result);
    });
    // Route handlers using the blog collection
    app.get('/api/v1/projects/:id', async (req, res) => {
      try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ message: 'Invalid project ID' });
        }

        const projectPost = await projects.findOne({ _id: new ObjectId(id) });

        if (!projectPost) {
          return res.status(404).json({ message: 'Project not found' });
        }

        res.json(projectPost);
      } catch (error) {
        console.error('Error fetching project:', error);
        res.status(500).json({ message: 'Internal Server Error' });
      }
    });

    app.delete('/api/v1/projects/:id', async (req, res) => {
      try {
        const { id } = req.params; // Correctly extract 'id' from params

        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ error: 'Invalid project ID' });
        }

        const result = await projects.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
          return res.status(404).json({ error: 'Project not found' });
        }

        res.json({ message: 'Project deleted successfully' });
      } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Update a project
    app.put('/api/v1/update-project/:id', async (req, res) => {
      try {
        const { id } = req.params; // Extract project ID from request parameters
        const updatedData = req.body; // Get the updated data from the request body

        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ message: 'Invalid project ID' });
        }

        // Check if the project exists
        const existingProject = await projects.findOne({
          _id: new ObjectId(id),
        });

        if (!existingProject) {
          return res.status(404).json({ message: 'Project not found' });
        }

        // Update the project data
        const result = await projects.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedData } // Use MongoDB's $set to update specific fields
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ message: 'Project not found' });
        }

        // Return the updated project data
        const updatedProject = await projects.findOne({
          _id: new ObjectId(id),
        });

        res.status(200).json({
          message: 'Project updated successfully',
          project: updatedProject,
        });
      } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ message: 'Internal Server Error' });
      }
    });

    // Create a blog
    app.post('/api/v1/create-blog', async (req, res) => {
      try {
        const data = req.body;

        // Add timestamp to the data object
        data.timestamp = new Date();

        // Use the already declared 'blog' collection (remove 'const')
        const result = await blog.insertOne(data);

        res.status(201).json({
          message: 'Blog created successfully!',
          blogId: result.insertedId,
          timestamp: data.timestamp, // Optional: return timestamp in response
        });
      } catch (error) {
        console.error('Error creating blog:', error);
        res.status(500).json({ message: 'Internal Server Error' });
      }
    });

    // Update a project
    app.put('/api/v1/update-project/:id', async (req, res) => {
      try {
        const { id } = req.params; // Extract project ID from request parameters
        const updatedData = req.body; // Get the updated data from the request body

        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ message: 'Invalid project ID' });
        }

        // Check if the project exists
        const existingProject = await projects.findOne({
          _id: new ObjectId(id),
        });

        if (!existingProject) {
          return res.status(404).json({ message: 'Project not found' });
        }

        // Update the project data
        const result = await projects.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedData } // Use MongoDB's $set to update specific fields
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ message: 'Project not found' });
        }

        // Return the updated project data
        const updatedProject = await projects.findOne({
          _id: new ObjectId(id),
        });

        res.status(200).json({
          message: 'Project updated successfully',
          project: updatedProject,
        });
      } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ message: 'Internal Server Error' });
      }
    });
    // save contact
    app.post('/api/v1/save-contact', async (req, res) => {
      try {
        const data = req.body;

        // Add timestamp to the data object
        data.timestamp = new Date();

        // Use the already declared 'blog' collection (remove 'const')
        const result = await contact.insertOne(data);

        res.status(201).json({
          message: 'Form submitted successfully',
          blogId: result.insertedId,
          timestamp: data.timestamp, // Optional: return timestamp in response
        });
      } catch (error) {
        console.error('Error submitted form:', error);
        res.status(500).json({ message: 'Internal Server Error' });
      }
    });

    // get all blogs
    app.get('/api/v1/blogs', async (req, res) => {
      const result = await blog.find().toArray();
      res.send(result);
    });

    // Route handlers using the blog collection
    app.get('/api/v1/blogs/:id', async (req, res) => {
      try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ message: 'Invalid blog ID' });
        }

        const blogPost = await blog.findOne({ _id: new ObjectId(id) });

        if (!blogPost) {
          return res.status(404).json({ message: 'Blog not found' });
        }

        res.json(blogPost);
      } catch (error) {
        console.error('Error fetching blog:', error);
        res.status(500).json({ message: 'Internal Server Error' });
      }
    });
    // Update a blog
    app.put('/api/v1/update-blog/:id', async (req, res) => {
      try {
        const { id } = req.params; // Extract blog ID from request parameters
        const updatedData = req.body; // Get the updated data from the request body

        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ message: 'Invalid blog ID' });
        }

        // Check if the blog exists
        const existingBlog = await blog.findOne({ _id: new ObjectId(id) });

        if (!existingBlog) {
          return res.status(404).json({ message: 'Blog not found' });
        }

        // Update the blog data
        const result = await blog.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedData } // Use MongoDB's $set to update specific fields
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ message: 'Blog not found' });
        }

        // Return the updated blog data
        const updatedBlog = await blog.findOne({ _id: new ObjectId(id) });

        res.status(200).json({
          message: 'Blog updated successfully',
          blog: updatedBlog,
        });
      } catch (error) {
        console.error('Error updating blog:', error);
        res.status(500).json({ message: 'Internal Server Error' });
      }
    });

    app.get('/api/v1/messages', async (req, res) => {
      const result = await contact.find().toArray();
      res.send(result);
    });

    app.delete('/api/v1/blog/:id', async (req, res) => {
      try {
        const { id } = req.params; // Correctly extract 'id' from params

        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ error: 'Invalid Blog ID' });
        }

        const result = await blog.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
          return res.status(404).json({ error: 'Blog not found' });
        }

        res.json({ message: 'Blog deleted successfully' });
      } catch (error) {
        console.error('Error deleting blog:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Start the server
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  } finally {
  }
}

run().catch(console.dir);

// Test route
app.get('/', (req, res) => {
  const serverStatus = {
    message: 'Server is running smoothly',
    timestamp: new Date(),
  };
  res.json(serverStatus);
});
