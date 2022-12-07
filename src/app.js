const express = require('express');
const bodyParser = require('body-parser');
const {Op} = require('sequelize')
const {sequelize} = require('./model')
const {getProfile} = require('./middleware/getProfile')
const app = express();
app.use(bodyParser.json());
app.set('sequelize', sequelize)
app.set('models', sequelize.models)

/**
 * FIX ME!
 * @returns contract by id
 */
app.get('/contracts/:id', getProfile ,async (req, res) =>{
    const {Contract} = req.app.get('models')
    const {id} = req.params
    const contract = await Contract.findByPk(id)
    if(!contract) return res.status(404).end()
    let profileId = Number(req.get('profile_id') || '0');
    if(contract.ContractorId !== profileId) return res.status(401).end()
    res.json(contract)
})

app.get('/contracts', getProfile ,async (req, res) =>{
    const {Contract} = req.app.get('models')
    let profileId = Number(req.get('profile_id') || '0');
    const contracts = await Contract.findAll({
      where: {
        ContractorId: {
          [Op.eq]: profileId
        }
      }
    });
    res.json(contracts)
})

app.get('/jobs/unpaid', getProfile ,async (req, res) =>{
    const {Contract, Job} = req.app.get('models')
    let profileId = Number(req.get('profile_id') || '0');
    const contracts = await Contract.findAll({
      where: {
        ContractorId: {
          [Op.eq]: profileId
        },
        status: {
          [Op.not]: 'terminated'
        }
      },
      include: {
        model: Job,
        where: { 
            paid: {
              [Op.not]: null
            }
        }
      }
    });
    res.json(contracts.map(c => c.Jobs).flat())
})

app.get('/jobs/paid', getProfile ,async (req, res) =>{
    const {Contract, Job} = req.app.get('models')
    let profileId = Number(req.get('profile_id') || '0');
    const contracts = await Contract.findAll({
      where: {
        ContractorId: {
          [Op.eq]: profileId
        },
        status: {
          [Op.eq]: 'terminated'
        }
      },
      include: {
        model: Job,
        where: { 
            paid: {
              [Op.not]: null
            }
        }
      }
    });
    res.json(contracts.map(c => c.Jobs).flat())
})

app.get('/jobs/:job_id/pay', getProfile, async (req, res) =>{
    const {Job} = req.app.get('models')
    let profileId = Number(req.get('profile_id') || '0');
    let { job_id } = req.params
    const job = await Job.findByPk(job_id)
    if (!job) return res.status(404).end()
    if (req.profile.balance < job.price) return res.status(404).send({ message: 'Insuficcient funnds' }).end()
    // TODO: verify that you are the Client to avoid paying others Jobs
    req.profile.balance -= job.price
    job.Contract.Contractor.balance += job.price
    await await Promise.all([req.profile.save(), job.save()]);
    res.json(job)
})

app.get('/balances/deposit/:userId', getProfile, async (req, res) =>{
    const {Profile} = req.app.get('models')
    let { userId } = req.params
    const userToDeposit = await Profile.findByPk(userId)
    if (!userToDeposit) return res.status(404).end()
    if (req.profile.balance < req.body.amount) return res.status(404).send({ message: 'Insuficcient funnds' }).end()
    // TODO: verify that you are the Client to avoid paying others Jobs
    req.profile.balance -= req.body.amount
    userToDeposit.balance += req.body.amount
    await await Promise.all([req.profile.save(), userToDeposit.save()]);
    res.json(req.profile)
})

app.get('/me', getProfile, async (req, res) =>{
    res.json(req.profile)
})

module.exports = app;
