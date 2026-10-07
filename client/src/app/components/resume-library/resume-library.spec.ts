import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResumeLibrary } from './resume-library';

describe('ResumeLibrary', () => {
  let component: ResumeLibrary;
  let fixture: ComponentFixture<ResumeLibrary>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResumeLibrary]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResumeLibrary);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
