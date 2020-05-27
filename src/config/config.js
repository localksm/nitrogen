//TODO make a separate config file for the consumer
//In production set addresses to externally available ip
const argv = require('yargs').argv

const hostConfig = {
    bootNodes: [argv.leader || '127.0.0.1:50505'],
    address: argv.address || '127.0.0.1',
    bootNode: argv.bootNode || false,
    refreshDirectory: argv.refreshDirectory || false,
    port: argv.port || 50505,
    outboundCount: 3,
    maxMessageStore: argv.maxMessageStore || 5000,
    addMeTTL: argv.addMeTTL || 500,
    addMeTTLBound: argv.addMeTTLBound,
    juryKey: argv.juryKey || '5Dbe9Pe9L9aaK3Ka3dEmx7Qb9dRX5XwD52CDU3wgLuT7sVFo', //ksm test
    //juryKey: argv.juryKey || 'tbnb1saex620zcur3xa4dcmpzafkncp3cqpjkgldcxj',
    //juryKey: argv.juryKey || 'GC3WNG5LCMMGD5SSTT35ZR6RWNEXJ6KWYG3CYFLPRCRALNQLMWRXGYXU',
    juryMeshPublicKey: '044a68235838f9a58de9caf1ef2c678bf2c9338da35affa33a978116c8a4de94f73850b15623fd44b8811b14faef1850b43ad819e8a4e80d75c3e4c276e3ce00b6',
    consumerId: argv.consumerId,
    meshPublicKey: argv.meshPublicKey,
    meshPrivateKey: argv.meshPrivateKey,
    //juryKey: argv.juryKey || '5Dbe9Pe9L9aaK3Ka3dEmx7Qb9dRX5XwD52CDU3wgLuT7sVFo', //ksm testplatformKey: '5CvesTH2npMQ1nz8Ru12xwNEMAqEmYa7rejRnhRW64G7FwUy', //ksm test
    //platformKey: 'tbnb1j4vzpgv8vnth4mgrjr6a2lta3dcnvdlrk3lmkg',
    //platformKey: 'GD5PN7AE3UP43LAVO7V5RQZNTCQWH23LVTA5WROE25RVF5FIMVUVQIEF',
    mode: argv.mode ||  'normal',
    chain: argv.chain || 'stellar',
    tssPort: argv.tss_port || 1240,
    tssIP: argv.tss_ip || '127.0.0.1',
    tssHome: argv.tss_home || argv.meshPublicKey
}
module.exports = hostConfig
