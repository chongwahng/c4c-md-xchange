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
                CompanyID: '',
                FirstName: '',
                LastName: '',
                Email: '',
                Phone: '',
                Status: ''
            }
        }

        return outboundMessagePayload
    }
}

module.exports = { messagePayload }