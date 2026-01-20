///////////////////////////////////////////////////////////////////////////////
// markdown_enhancements.js
// Enhances rendered markdown with interactive features

// Initialize markdown enhancements when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
	enhance_code_blocks();
});

function enhance_code_blocks() {
	// Find all code blocks within markdown tags
	const markdown_containers = document.querySelectorAll('markdown');
	
	markdown_containers.forEach(container => {
		const code_blocks = container.querySelectorAll('pre code');
		
		code_blocks.forEach(code_block => {
			const pre = code_block.parentElement;
			
			// Skip if already enhanced
			if (pre.classList.contains('enhanced')) return;
			
			// Wrap the pre in a container for positioning
			const wrapper = document.createElement('div');
			wrapper.className = 'code-block-wrapper';
			pre.parentNode.insertBefore(wrapper, pre);
			wrapper.appendChild(pre);
			
			// Detect language from class (e.g., language-javascript)
			let language = '';
			const class_list = code_block.className.match(/language-(\w+)/);
			if (class_list && class_list[1]) {
				language = class_list[1];
			}
			
			// Create language label if language is specified
			if (language) {
				const lang_label = document.createElement('div');
				lang_label.className = 'code-language-label';
				lang_label.textContent = language;
				wrapper.appendChild(lang_label);
			}
			
			// Create copy button
			const copy_button = document.createElement('button');
			copy_button.className = 'code-copy-button';
			copy_button.innerHTML = '<i class="fa fa-copy" aria-hidden="true"></i> Copy';
			copy_button.setAttribute('aria-label', 'Copy code to clipboard');
			
			// Add click handler
			copy_button.addEventListener('click', async (e) => {
				e.preventDefault();
				const code_text = code_block.textContent;
				
				try {
					await navigator.clipboard.writeText(code_text);
					
					// Show success feedback
					copy_button.innerHTML = '<i class="fa fa-check" aria-hidden="true"></i> Copied!';
					copy_button.classList.add('copied');
					
					// Reset after 2 seconds
					setTimeout(() => {
						copy_button.innerHTML = '<i class="fa fa-copy" aria-hidden="true"></i> Copy';
						copy_button.classList.remove('copied');
					}, 2000);
				} catch (err) {
					// Fallback for older browsers
					const textarea = document.createElement('textarea');
					textarea.value = code_text;
					textarea.style.position = 'fixed';
					textarea.style.opacity = '0';
					document.body.appendChild(textarea);
					textarea.select();
					
					try {
						document.execCommand('copy');
						copy_button.innerHTML = '<i class="fa fa-check" aria-hidden="true"></i> Copied!';
						copy_button.classList.add('copied');
						
						setTimeout(() => {
							copy_button.innerHTML = '<i class="fa fa-copy" aria-hidden="true"></i> Copy';
							copy_button.classList.remove('copied');
						}, 2000);
					} catch (err) {
						console.error('Failed to copy code:', err);
					}
					
					document.body.removeChild(textarea);
				}
			});
			
			wrapper.appendChild(copy_button);
			pre.classList.add('enhanced');
		});
	});
}
