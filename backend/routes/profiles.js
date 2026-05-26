const express = require('express');
const sf = require('../config/sfClient');

const router = express.Router();
const ENTITY = process.env.SF_MDF_ENTITY || 'cust_success_mdf';
const SELECT = 'externalCode,cust_Name,cust_Age,cust_Gender';

function forwardError(err, res) {
  const status = err.response?.status || 500;
  const payload = err.response?.data || { message: err.message };
  res.status(status).json({ error: payload });
}

function keyUrl(id) {
  return `/${ENTITY}('${encodeURIComponent(id)}')`;
}

router.get('/', async (_req, res) => {
  try {
    const { data } = await sf.get(`/${ENTITY}`, {
      params: { $select: SELECT, $format: 'json' },
    });
    res.json(data?.d?.results ?? []);
  } catch (err) {
    forwardError(err, res);
  }
});

router.post('/', async (req, res) => {
  try {
    const { data } = await sf.post(`/${ENTITY}`, req.body);
    res.status(201).json(data?.d ?? data);
  } catch (err) {
    forwardError(err, res);
  }
});

router.put('/:id', async (req, res) => {
  try {
    await sf.put(keyUrl(req.params.id), req.body);
    res.status(204).end();
  } catch (err) {
    forwardError(err, res);
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await sf.delete(keyUrl(req.params.id));
    res.status(204).end();
  } catch (err) {
    forwardError(err, res);
  }
});

module.exports = router;
