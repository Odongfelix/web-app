import { TestBed } from '@angular/core/testing';

import { McurrencyService } from './mcurrency.service';

describe('McurrencyService', () => {
  let service: McurrencyService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(McurrencyService);
  });

  it('should be created', () => {
    // @ts-ignore
    expect(service).toBeTruthy();
  });
});
