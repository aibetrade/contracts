// contract("AppStore", function (/* accounts */) {
// 	require('./appstore/index')()
// })

contract("Referal-Tarif", function (/* accounts */) {
	require('./0.initial.section')()
	require('./1.give-usdt.section')()
	require('./2.1.manage-tarifs.section')()
	require('./2.2.manage-ranks.section')()

	// require('./3.mentor.section')()
	// require('./4.client-tarif.section')()
	// require('./5.register.section')()
	// require('./6.partner-tarif.section')()
	// require('./7.reject.section')()
	// require('./8.comsa.section')()
	// require('./9.net-comsa.section')()

	require('./10.admin-set-tarifs')()
})