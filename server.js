const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// Connect to MongoDB
mongoose.connect('mongodb+srv://chinhoo0598:EXidPtZvXKTvkG3b@cluster0.kjxkjsc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', { useNewUrlParser: true, useUnifiedTopology: true });

// Annotation Model
const Annotation = mongoose.model('Annotation', new mongoose.Schema({
  userId: String,
  stockSymbol: String,
  annotation: Object
}));

// Alpha Vantage API Configuration
const API_KEY = 'J2I23738J3AWVR1W'; 
const API_URL = 'https://www.alphavantage.co/query';

// Search endpoint
app.get('/search', async (req, res) => {
  try {
    const query = req.query.q;
    const response = await axios.get(`${API_URL}?function=SYMBOL_SEARCH&keywords=${query}&apikey=${API_KEY}`);
    res.json(response.data.bestMatches);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search stocks' });
  }
});

// Historical data endpoint
app.get('/historical/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol;
    const response = await axios.get(`${API_URL}?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${API_KEY}`);
    res.json(response.data['Time Series (Daily)']);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch historical data' });
  }
});

// Fetch annotations
app.get('/annotations', async (req, res) => {
  const { symbol } = req.query;
  const annotations = await Annotation.find({ stockSymbol: symbol });
  res.json(annotations);
});

// Save annotation
app.post('/annotations', async (req, res) => {
  const { stockSymbol, annotation } = req.body;
  const anno = new Annotation({ userId: 'user1', stockSymbol, annotation }); // Simplified userId
  await anno.save();
  res.json({ message: 'Annotation saved' });
});

app.listen(3000, () => console.log('Server running on port 3000'));