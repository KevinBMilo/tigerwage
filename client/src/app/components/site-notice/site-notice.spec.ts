import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SiteNotice } from './site-notice';

describe('SiteNotice', () => {
  let component: SiteNotice;
  let fixture: ComponentFixture<SiteNotice>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SiteNotice]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SiteNotice);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
