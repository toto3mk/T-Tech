const API_BASE = window.API_BASE_URL || 'http://localhost:3000/api';
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('currentYear').textContent = new Date().getFullYear();
    const form = document.getElementById('project-form');
    const messageBox = document.getElementById('message-box');
    function showMessage(msg, isError) {
        messageBox.classList.remove('hidden', 'bg-red-500/10', 'text-red-400', 'border-red-500/20', 'bg-emerald-500/10', 'text-emerald-400');
        if (isError) messageBox.classList.add('bg-red-500/10', 'text-red-400', 'border-red-500/20');
        else messageBox.classList.add('bg-emerald-500/10', 'text-emerald-400');
        messageBox.innerHTML = msg;
    }
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            clientName: document.getElementById('clientName').value,
            contactPerson: document.getElementById('contactPerson').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            projectName: document.getElementById('projectName').value,
            projectDescription: document.getElementById('projectDescription').value,
            dueDate: document.getElementById('dueDate').value,
            budget: parseFloat(document.getElementById('budget').value),
            duration: document.getElementById('duration').value ? parseInt(document.getElementById('duration').value) : null
        };
        const submitButton = document.getElementById('submitBtn');
        submitButton.disabled = true; submitButton.textContent = 'Sending...';
        try {
            const res = await fetch(`${API_BASE}/project-submission`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) { showMessage('Success! Inquiry sent.', false); form.reset(); }
            else showMessage('Error submitting inquiry.', true);
        } catch (err) { showMessage('Connection error.', true); }
        finally { submitButton.disabled = false; submitButton.textContent = 'Submit Inquiry'; }
    });
});

document.getElementById('rephraseBtn').addEventListener('click', async () => {
    // 1. Get the draft from the sidebar box
    const sidebarDesc = document.getElementById('projectDesc');
    // 2. Reference the ACTUAL form field where the data is submitted
    const mainFormDesc = document.getElementById('projectDescription');
    
    const originalText = sidebarDesc.value;

    if (!originalText) return alert("Please type something in the 'How It Works' box first!");

    const btn = document.getElementById('rephraseBtn');
    btn.innerText = "Refining...";
    btn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/rephrase`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ draftText: originalText })
        });

        const data = await response.json();

        if (response.ok && data.polishedText) {
            // Clean up any stray markdown formatting if the AI ignores prompts
            let cleanText = data.polishedText.replace(/\*\*/g, ''); // Remove bold asterisks
            cleanText = cleanText.replace(/^\s*\*\s/gm, '- '); // Replace list asterisks with dashes
            
            // Only format the target project submission box (Do not overwrite UI draft)
            mainFormDesc.value = cleanText;
            
            // Optional: Scroll them back to the form so they see it worked
            mainFormDesc.scrollIntoView({ behavior: 'smooth' });
        } else {
            alert(data.polishedText || "The AI returned an error response. Check server logs/api keys.");
        }
    } catch (err) {
        console.error("Fetch Error:", err);
        alert("Connection failed. Is the server running on port 3000?");
    } finally {
        btn.innerText = "✨ Help me phrase this";
        btn.disabled = false;
    }
});