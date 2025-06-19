import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Provedores } from './provedores';

describe('Provedores', () => {
  let component: Provedores;
  let fixture: ComponentFixture<Provedores>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Provedores]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Provedores);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
