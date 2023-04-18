class errorHandler {
    static print(err) {
        if (err.code) {
            console.log(err.code)
        }
        if (err.errno) {
            console.log(err.errno)
        }
        if (err.stack) {
            console.log(err.stack)
        }
        if (err.message) {
            console.log(err.message)
        }
    }
}

module.exports = { errorHandler }