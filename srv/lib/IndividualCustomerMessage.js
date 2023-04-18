class messagePayload {
    static initialize() {
        let outboundMessagePayload = {
            EventName: '',
            EventType: '',
            EventTriggeredOn: '',
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

                SalesRepCode: '',
                TaxId: ''
            }
        }

        return outboundMessagePayload
    }
}

module.exports = { messagePayload }