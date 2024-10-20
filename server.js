
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const leaderBoard = require('./src/leaderBoard.json');


app.use(bodyParser.json());


app.get('/api/leaderBoard', (req, res) => {
   
    res.json({ message: leaderBoard });
  });

  app.post('/api/leaderBoard', (req, res) => {
    const newName = req.body.name;
    const newScore = req.body.score;
    //todos.push(newTodo);
    //res.status(201).json(newTodo);
    res.json({ message: newName });
  });
  
const port = process.env.PORT || 5173;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

