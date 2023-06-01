class messagePayload {
    static initialize() {
        let outboundMessagePayload = {
            EventName: '',
            EventType: '',
            EventTriggeredOn: '',
            EventSpecInfo: {
                TopicStrings: [],
                OriginalEventName: ''
            },            
            Entity: {
                AccountId: '',
                ContactCode: '',
                FirstName: '',
                LastName: '',
                Email: '',
                Phone: '',
                Type: '',
                Status: '',
                MaximumOrderAmount: '',
                MaximumOrderAmountCurrencyCode: '',
                CountryCode: '',
                BusinessPartnerRelationshipDeletion: '',
                ApproveOrderFor: [],
                ListOfAccount: []
            }
        }

        return outboundMessagePayload
    }
}

module.exports = { messagePayload }