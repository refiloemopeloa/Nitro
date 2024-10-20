
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const leaderBoard = require('./src/leaderBoard.json');
const fs = require('fs'); 
const filePath = './src/leaderBoard.json';
const rawData = fs.readFileSync(filePath);
const jsonData = JSON.parse(rawData); 



app.use(bodyParser.json());


app.get('/api/leaderBoard', (req, res) => {
   
    res.json({ message: jsonData});
  });

  app.post('/api/leaderBoard', (req, res) => {
    const newName = req.body.name;
    const newScore = req.body.score;
    //jsonData.name = newName;
    //jsonData.score = newScore;
    jsonData.push({"name": newName, "score": newScore});
    fs.writeFileSync(filePath, JSON.stringify(jsonData));
    //leaderBoard.push({"name": newName, "score": newScore});
    //res.status(201).json(newTodo);
    res.json({ message: jsonData });
  });
  
const port = process.env.PORT || 5174;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

