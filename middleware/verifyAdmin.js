var jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWTSECRET;

const verifyAdmin = (req,res,next) => {

    const token = req.header('auth-token');
    if (!token) {
        res.status(401).send({ error: "Can't Access...Admin only privilages" });
    }

    try {
        const data = jwt.verify(token, JWT_SECRET);
        req.admin = data.admin;
        next();
    }
    catch (error) {
        res.status(401).send({ error: "Please Enter correct credentials" });
    }
}

module.exports = verifyAdmin;