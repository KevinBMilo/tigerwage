import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApplicationDocuments } from './application-documents';

describe('ApplicationDocuments', () => {
  let component: ApplicationDocuments;
  let fixture: ComponentFixture<ApplicationDocuments>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApplicationDocuments]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApplicationDocuments);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
