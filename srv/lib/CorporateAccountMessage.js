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
                Role: '',
                ERPAccountID: '',
                AccountName: '',
                AccountStatus: '',
                DefaultStore: '',
                ClientGroup: '',
                RequestChorus: '',

                InvoicingHouseNumber: '',
                InvoicingAddress1: '',
                InvoicingAddress2: '',
                InvoicingPostalCode: '',
                InvoicingCity: '',
                InvoicingCountry: '',

                DeliveryHouseNumber: '',
                DeliveryAddress1: '',
                DeliveryAddress2: '',
                DeliveryPostalCode: '',
                DeliveryCity: '',
                DeliveryCountry: '',

                PaymentMethods: '',
                DeliveryMethods: '',
                OrganisationId: '',
                DistributionChannel: '',
                Division: '',

                SalesRepCode: '',
                FidelityProgram: '',
                TaxId: '',
                CompanyID: ''
            }
        }

        return outboundMessagePayload
    }
}

module.exports = { messagePayload }