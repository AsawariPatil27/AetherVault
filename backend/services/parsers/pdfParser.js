import axios from "axios";
import pdf from "pdf-parse";

export const parsePdf = async(fileUrl)=>
{
    const response = await axios.get(fileUrl,
        {
            responseType: "arraybuffer"
        }
    );
    const data = await pdf(response.data);

    return data.text;
};