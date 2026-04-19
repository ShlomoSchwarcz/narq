const request = require('supertest');

// Define the base URL for your NARQ service
const BASE_URL = 'http://localhost:3000'; // Change the port if needed

describe('NARQ API Tests', () => {
    it('should return 200 OK for the health endpoint', async () => {
        const response = await request(BASE_URL).get('/health');
        expect(response.status).toBe(200);
        expect(response.body).toEqual(expect.objectContaining(
            {status: 'ok'},
        ));
    });

    it('should successfully add a message to the queue', async () => {

        await request(BASE_URL)
            .delete('/queues/narq_test')
            .send()
            .set('Content-Type', 'application/json');


        const response = await request(BASE_URL)
            .post('/queues')
            .send({name: "narq_test"})
            .set('Content-Type', 'application/json');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('id');
    });

    // it('should retrieve a message from the queue', async () => {
    //     const response = await request(BASE_URL).get('/queue');

    //     expect(response.status).toBe(200);
    //     expect(response.body).toEqual(
    //         expect.objectContaining({
    //             message: expect.any(String),
    //             priority: expect.any(String),
    //         })
    //     );
    // });
});

