const express = require('express');
const app = express();
const cors = require('cors');
const jobsRoutes = require('./routes/jobs');

app.use(cors());
app.use(express.json());

app.use('/jobs', jobsRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
