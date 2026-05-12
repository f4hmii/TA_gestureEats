const getHtml = async () => {
    try {
        const response = await fetch('http://localhost:3000/src/App.tsx');
        const text = await response.text();
        if (text.includes("import") || text.includes("const")) {
            console.log("App.tsx response seems valid (starts with import/const)");
            
            // Check for potential runtime errors in the processed file? No, just check if it's served.
            // But let's check its output.
            if(text.includes('Error')) {
                 console.log("Found error inside text:", text.substring(0, 1000));
            } else {
                 console.log("No explicit error string returned by vite.");
            }
        } else {
             console.log(text.substring(0, 500));
        }
    } catch (err) {
        console.error(err);
    }
}
getHtml();
