const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const jobsPath = path.join(__dirname, '../data/jobs.json');
const profilesPath = path.join(__dirname, '../data/profiles.json');

router.get('/', (req, res) => {
  const jobs = JSON.parse(fs.readFileSync(jobsPath, 'utf8'));
  res.json(jobs);
});

router.post('/apply', (req, res) => {
  const { jobId, accountLabel } = req.body;
  if (!jobId || !accountLabel) return res.status(400).json({ error: 'Missing data' });

  let profiles = {};
  if (fs.existsSync(profilesPath)) {
    profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf8'));
  }

  if (!profiles[accountLabel]) {
    profiles[accountLabel] = { appliedJobs: [] };
  }

  if (!profiles[accountLabel].appliedJobs.includes(jobId)) {
    profiles[accountLabel].appliedJobs.push(jobId);
  }

  fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 2));
  res.json({ success: true, profile: profiles[accountLabel] });
});

router.get('/applied/:accountLabel', (req, res) => {
  const { accountLabel } = req.params;

  const jobs = JSON.parse(fs.readFileSync(jobsPath, 'utf8'));
  const profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf8'));

  const appliedJobIds = profiles[accountLabel]?.appliedJobs || [];
  const appliedJobs = jobs.filter((job) => appliedJobIds.includes(job.id));

  res.json(appliedJobs);
});

module.exports = router;
