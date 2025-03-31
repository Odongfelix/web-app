// Add to the form controls
this.loanApplicationForm = this.formBuilder.group({
  // ... existing controls ...
  'linkSavingsAccount': [''],
  'savingsAccountId': ['']
});

// Add method to fetch client's savings accounts
getSavingsAccounts(clientId: string) {
  this.loansService.getClientSavingsAccounts(clientId)
    .subscribe((savingsAccounts: any) => {
      this.savingsAccounts = savingsAccounts;
    });
} 