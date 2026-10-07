import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JobBoard } from './job-board';

describe('JobBoard', () => {
  let component: JobBoard;
  let fixture: ComponentFixture<JobBoard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JobBoard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(JobBoard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
