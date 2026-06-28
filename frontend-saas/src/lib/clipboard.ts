/**
 * Copies text to the clipboard with a fallback for non-secure contexts.
 * @param text The text to copy
 * @returns A promise that resolves to true if the copy was successful, false otherwise.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        // Try the modern Clipboard API first (requires secure context)
        if (navigator.clipboard && typeof window !== 'undefined' && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            // Fallback for non-secure contexts or older browsers
            const textArea = document.createElement("textarea");
            textArea.value = text;
            
            // Ensure the textarea is not visible but part of the document
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            textArea.style.top = "-9999px";
            textArea.style.opacity = "0";
            
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                return successful;
            } catch (err) {
                console.error('Fallback: Oops, unable to copy', err);
                document.body.removeChild(textArea);
                return false;
            }
        }
    } catch (err) {
        console.error('Failed to copy text: ', err);
        return false;
    }
}
