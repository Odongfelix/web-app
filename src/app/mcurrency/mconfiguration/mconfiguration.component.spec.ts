import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MconfigurationComponent } from './mconfiguration.component';

describe('MconfigurationComponent', () => {
  let component: MconfigurationComponent;
  let fixture: ComponentFixture<MconfigurationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MconfigurationComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MconfigurationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    // @ts-ignore
    expect(component).toBeTruthy();
  });
});
