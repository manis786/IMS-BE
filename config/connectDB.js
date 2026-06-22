import mongoose  from "mongoose";
import config from "./config.js";

const connectDB = async () =>{
    try {
        await mongoose.connect(config.MONGODB_URI)
        console.log(`Database Connected !`)
    } catch (error) {
        console.log(`Error While Connecting Database ${error}`)
    }
}
export default connectDB