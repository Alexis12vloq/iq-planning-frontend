import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanMediosConsulta } from './plan-medios-consulta';

describe('PlanMediosConsulta', () => {
  let component: PlanMediosConsulta;
  let fixture: ComponentFixture<PlanMediosConsulta>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlanMediosConsulta]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlanMediosConsulta);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
