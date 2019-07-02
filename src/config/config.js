const argv = require('yargs').argv

const hostConfig = {
    bootNodes : [ argv.leader || '127.0.0.1:50505'],
    address : argv.address || '127.0.0.1',
    bootNode: argv.bootNode || false,
    refreshDirectory: argv.refreshDirectory || false,
    port : argv.port || 4020,
    outboundCount: 3,
    maxMessageStore: argv.maxMessageStore || 5000,
    addMeTTL: argv.addMeTTL || 500,
    addMeTTLBound: argv.addMeTTLBound,
    juryKey: argv.juryKey || 'GDIAIGUHDGMTDLKC6KFU2DIR7JVNYI4WFQ5TWTVKEHZ4G3T47HEFNUME'
}
module.exports = hostConfig
