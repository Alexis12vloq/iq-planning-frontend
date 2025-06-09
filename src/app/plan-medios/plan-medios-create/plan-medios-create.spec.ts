import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanMediosCreate } from './plan-medios-create';

describe('PlanMediosCreate', () => {
  let component: PlanMediosCreate;
  let fixture: ComponentFixture<PlanMediosCreate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlanMediosCreate]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlanMediosCreate);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
