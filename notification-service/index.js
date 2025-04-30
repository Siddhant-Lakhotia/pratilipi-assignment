require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { Kafka } = require('kafkajs');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Notification Schema
const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  type: { type: String, enum: ['promotion', 'order_update', 'recommendation'], required: true },
  content: { type: mongoose.Schema.Types.Mixed, required: true },
  sentAt: { type: Date, default: Date.now },
  read: { type: Boolean, default: false }
});
const Notification = mongoose.model('Notification', notificationSchema);

// Kafka Setup
const kafka = new Kafka({
  clientId: 'notification-service',
  brokers: [process.env.KAFKA_BROKERS]
});

// Kafka Consumer
const runConsumer = async () => {
  const consumer = kafka.consumer({ groupId: 'notification-group' });
  
  await consumer.connect();
  await consumer.subscribe({ topic: 'user-activity', fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const event = JSON.parse(message.value.toString());
      console.log('Processing event:', event);
      
      await Notification.create({
        userId: event.userId,
        type: event.type,
        content: event.content
      });
    }
  });
};

runConsumer().catch(console.error);

// API Endpoints
app.get('/notifications/:userId', async (req, res) => {
  try {
    const notifications = await Notification.find({
      userId: req.params.userId,
      read: false
    });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/notifications/:id/mark-read', async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { read: true });
    res.json({ status: 'Notification marked as read' });
  } catch (err) {
    res.status(404).json({ error: 'Notification not found' });
  }
});

app.listen(process.env.PORT, () => 
  console.log(`Notification service running on port ${process.env.PORT}`));