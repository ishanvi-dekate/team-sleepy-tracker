import { useState } from "react"
import Mental from "./Mental.jsx"
import "./ViewMental.css"
function ViewMental() {
    const [page,setPage] = useState('')
    return (
        <div className="mental-page">
            <div className="mental-banner">
                <button className= "viewMental-back-btn" onClick={()=>setPage("Mental")}>Back</button>
                <h1 className="mental-title">View Past Mental Checks</h1>
            </div>
            <div className = "viewPast">
                <table className= "pastChecks">
                    <tr>
                        Date
                    </tr>
                    <tr>
                        Past Mental Checks
                    </tr>
                </table>
            </div>

        </div>
    )
}
export default ViewMental