class messagePayload {
    static initialize() {
        let outboundMessagePayload = {
            EventName: '',
            EventType: '',
            ObjectName: '',
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
                BusinessPartnerRelationship: []
            }
        }

        return outboundMessagePayload
    }
}

module.exports = { messagePayload }