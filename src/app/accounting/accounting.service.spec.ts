import { TestBed, inject } from '@angular/core/testing';

import { AccountingService } from './accounting.service';

describe('AccountingService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AccountingService]
    });
  });

  it('should be created', inject([AccountingService], (service: AccountingService) => {
    // @ts-ignore
    expect(service).toBeTruthy();
  }));
});
