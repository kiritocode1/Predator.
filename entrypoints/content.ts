export default defineContentScript({
  matches: ['*://*.github.com/*'],
  main() {
    console.log('GitHub PR Helper loaded');
    
    // Observe DOM changes to detect when we're on a PR creation page
    const observer = new MutationObserver(() => {
      // Check if we're on a PR creation page
      if (isPRCreationPage()) {
        if (!document.querySelector('#ai-pr-description-button')) {
          addGenerateButton();
        }
      }
    });

    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Initial check in case we're already on a PR creation page
    if (isPRCreationPage()) {
      addGenerateButton();
    }
  },
});

// Function to determine if we're on a PR creation page
function isPRCreationPage() {
  // Check if we're on the compare page or pull request creation page
  return window.location.pathname.includes('/compare') || 
         window.location.pathname.includes('/pull/new');
}

// Function to add our "Generate Description" button
function addGenerateButton() {
  // Find the PR description textarea
  const textarea = document.querySelector('textarea[name="pull_request[body]"]');
  if (!textarea) return;

  // Create button container
  const container = document.createElement('div');
  container.style.margin = '10px 0';
  
  // Create the button
  const button = document.createElement('button');
  button.id = 'ai-pr-description-button';
  button.textContent = 'Generate PR Description';
  button.className = 'btn btn-sm';
  button.style.marginRight = '8px';
  
  // Add click handler
  button.addEventListener('click', async () => {
    button.disabled = true;
    button.textContent = 'Generating...';
    
    try {
      const description = await generatePRDescription();
      if (description) {
        // Insert the generated description into the textarea
        textarea.textContent = description;
        // Trigger input event to ensure GitHub registers the change
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } catch (error) {
      console.error('Error generating PR description:', error);
      alert('Failed to generate PR description. Please try again.');
    } finally {
      button.disabled = false;
      button.textContent = 'Generate PR Description';
    }
  });
  
  container.appendChild(button);
  

  const parent = textarea.parentNode;
  if (!parent) return;
  parent.insertBefore(container, textarea);
}

// Function to extract diff data
async function extractDiffData() {
  // Get the diff data from the page
  const diffElements = document.querySelectorAll('.diff-table');
  if (!diffElements.length) {
    // Try to get diffs from the files changed tab if available
    const filesTabLink = Array.from(document.querySelectorAll('a.tabnav-tab')).find(
      el => el.textContent?.includes('Files changed')
    );
    
    if (filesTabLink) {
      // Click on the files tab to load the diffs
      (filesTabLink as HTMLAnchorElement).click();
      // Wait for diffs to load
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Re-query for diff elements
  const allDiffElements = document.querySelectorAll('.diff-table, .js-file-content');
  
  if (!allDiffElements.length) {
    return 'No diff data found. Make sure you have committed changes to compare.';
  }
  
  // Extract the file names and changes
  let diffData = '';
  
  allDiffElements.forEach(diffElement => {
    // Get the file name
    const fileNameElement = diffElement.closest('.js-file')?.querySelector('.file-header') ||
                            diffElement.closest('.file')?.querySelector('.file-header');
    
    const fileName = fileNameElement?.getAttribute('data-path') || 'Unknown file';
    
    // Add file name to diff data
    diffData += `\n## ${fileName}\n\n`;
    
    // Get the changes for this file
    const codeLines = diffElement.querySelectorAll('.blob-code');
    codeLines.forEach(line => {
      const lineText = line.textContent || '';
      const isAddition = line.classList.contains('blob-code-addition');
      const isDeletion = line.classList.contains('blob-code-deletion');
      
      if (isAddition) {
        diffData += `+ ${lineText}\n`;
      } else if (isDeletion) {
        diffData += `- ${lineText}\n`;
      }
    });
    
    diffData += '\n';
  });
  
  return diffData || 'Could not extract specific diff data';
}

// Function to generate PR description using AI
async function generatePRDescription() {
  try {
    // Extract diff data
    const diffData = await extractDiffData();
    
    // Get PR title if available
    const titleInput = document.querySelector('input[name="pull_request[title]"]');
    const prTitle = titleInput ? (titleInput as HTMLInputElement).value : '';
    
    // Get the branch names
    const compareBranches = document.querySelector('.range-cross-repo-pair .css-truncate-target');
    const branchInfo = compareBranches ? compareBranches.textContent : '';
    
    // For a real implementation, you would send this data to your AI service
    // Here you would make an API call to your preferred AI service
    
    // Example: Call to a background script that makes the API request
    const response = await browser.runtime.sendMessage({
      action: 'generatePRDescription',
      data: {
        diffData,
        prTitle,
        branchInfo
      }
    });
    
    // If you have the response from the background script:
    if (response && response.generatedDescription) {
      return response.generatedDescription;
    }
    
    // Fallback placeholder in case the background service isn't set up yet
    return `# ${prTitle || 'Pull Request Description'}

## Summary
This PR includes changes to ${diffData.includes('Unknown file') ? 'multiple files' : 'the codebase'}.

## Changes Made
${diffData.length > 200 ? 
  '(Diff data extracted - in a real implementation, this would be processed by an AI to generate a detailed description)' : 
  diffData}

## Testing
- [ ] Add testing steps here

## Additional Notes
- Branch information: ${branchInfo || 'Not available'}

---
*This description was auto-generated by the GitHub PR Helper extension. Please edit as needed.*`;
  } catch (error) {
    console.error('Error in generatePRDescription:', error);
    return null;
  }
}
